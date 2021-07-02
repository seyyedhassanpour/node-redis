import assert from 'assert/strict';
import RedisClient, { RedisClientType } from './client';
import { RedisModules } from './commands';
import { RedisLuaScripts } from './lua-script';
import { spawn } from 'child_process';
import { once } from 'events';
import { RedisSocketOptions } from './socket';
import which from 'which';
import { SinonSpy } from 'sinon';
import { setTimeout } from 'timers/promises';
import RedisCluster, { RedisClusterType } from './cluster';
import { unlink } from 'fs/promises';

export enum TestRedisServers {
    OPEN,
    PASSWORD
}

export const TEST_REDIS_SERVERS: Record<TestRedisServers, RedisSocketOptions> = <any>{};

export enum TestRedisClusters {
    OPEN
}

export const TEST_REDIS_CLUSTERES: Record<TestRedisClusters, Array<RedisSocketOptions>> = <any>{};

before(function () {
    this.timeout(10000);
    
    return Promise.all([
        spawnOpenServer(),
        spawnPasswordServer(),
        spawnOpenCluster()
    ]);
});

async function spawnOpenServer(): Promise<void> {
    TEST_REDIS_SERVERS[TestRedisServers.OPEN] = {
        port: await spawnGlobalRedisServer()
    };
}

async function spawnPasswordServer(): Promise<void> {
    TEST_REDIS_SERVERS[TestRedisServers.PASSWORD] = {
        port: await spawnGlobalRedisServer(['--requirepass', 'password']),
        username: 'default',
        password: 'password'
    };
}

async function spawnOpenCluster(): Promise<void> {
    TEST_REDIS_CLUSTERES[TestRedisClusters.OPEN] = (await spawnGlobalRedisCluster(TestRedisClusters.OPEN, 3)).map(port => ({
        port
    }));
}

export function itWithClient(type: TestRedisServers, title: string, fn: (client: RedisClientType<RedisModules, RedisLuaScripts>) => Promise<void>): void {
    it(title, async () => {
        const client = RedisClient.create({
            socket: TEST_REDIS_SERVERS[type]
        });
        
        await client.connect();

        try {
            await client.flushAll();
            await fn(client);
        } finally {
            await client.flushAll();
            await client.disconnect();
        }
    });
}

export function itWithCluster(type: TestRedisClusters, title: string, fn: (cluster: RedisClusterType<RedisModules, RedisLuaScripts>) => Promise<void>): void {
    it(title, async () => {
        const cluster = RedisCluster.create({
            rootNodes: TEST_REDIS_CLUSTERES[type]
        });
        
        await cluster.connect();

        try {
            await clusterFlushAll(cluster);
            await fn(cluster);
        } finally {
            await clusterFlushAll(cluster);
            await cluster.disconnect();
        }
    });
}

export function itWithDedicatedCluster(title: string, fn: (cluster: RedisClusterType<RedisModules, RedisLuaScripts>) => Promise<void>): void {
    it(title, async function () {
        this.timeout(10000);

        const spawnResults = await spawnRedisCluster(null, 3),
            cluster = RedisCluster.create({
                rootNodes: [{
                    port: spawnResults[0].port
                }]
            });
        
        await cluster.connect();

        try {
            await fn(cluster);
        } finally {
            await cluster.disconnect();
            
            for (const { cleanup } of spawnResults) {
                await cleanup();
            }
        }
    });
}

async function clusterFlushAll(cluster: RedisCluster): Promise<void> {
    await Promise.all(
        cluster.getMasters().map(({ client }) => client.flushAll())
    );
}

const REDIS_PATH = which.sync('redis-server');

let port = 6379;

interface SpawnRedisServerResult {
    port: number;
    cleanup: () => Promise<void>;
}

async function spawnRedisServer(args?: Array<string>): Promise<SpawnRedisServerResult> {
    const currentPort = port++,
        process = spawn(REDIS_PATH, [
            '--save',
            '',
            '--port',
            currentPort.toString(),
            ...(args ?? [])
        ]);
    
    process
        .on('error', err => console.error('Redis process error', err))
        .on('close', code => console.error(`Redis process closed unexpectedly with code ${code}`));

    for await (const chunk of process.stdout) {
        if (chunk.toString().includes('Ready to accept connections')) {
            break;
        }
    }

    if (process.exitCode !== null) {
        throw new Error('Error while spawning redis server');
    }

    return {
        port: currentPort,
        async cleanup(): Promise<void> {
            process.removeAllListeners('close');
            assert.ok(process.kill());
            await once(process, 'close');
        }
    };
}

async function spawnGlobalRedisServer(args?: Array<string>): Promise<number> {
    const { port, cleanup } = await spawnRedisServer(args);
    after(cleanup);
    return port;
}

const SLOTS = 16384,
    CLUSTER_NODE_TIMEOUT = 2000;

export async function spawnRedisCluster(type: TestRedisClusters | null, numberOfNodes: number, args?: Array<string>): Promise<Array<SpawnRedisServerResult>> {
    const spawnPromises = [],
        slotsPerNode = Math.floor(SLOTS / numberOfNodes);
    for (let i = 0; i < numberOfNodes; i++) {
        const fromSlot = i * slotsPerNode;
        spawnPromises.push(
            spawnRedisClusterNode(
                type,
                i,
                fromSlot,
                i === numberOfNodes - 1 ? SLOTS : fromSlot + slotsPerNode,
                args
            )
        );
    }

    const spawnResults = await Promise.all(spawnPromises),
        meetPromises = [];
    for (let i = 1; i < spawnResults.length; i++) {
        meetPromises.push(
            spawnResults[i].client.clusterMeet(
                '127.0.0.1',
                spawnResults[i - 1].port
            )
        );
    }

    while ((await spawnResults[0].client.clusterInfo()).state !== 'ok') {
        await setTimeout(CLUSTER_NODE_TIMEOUT);
    }

    const disconnectPromises = [];
    for (const result of spawnResults) {
        disconnectPromises.push(result.client.disconnect());
    }

    await Promise.all(disconnectPromises);

    return spawnResults;
}

export async function spawnGlobalRedisCluster(type: TestRedisClusters | null, numberOfNodes: number, args?: Array<string>): Promise<Array<number>> {
    const results = await spawnRedisCluster(type, numberOfNodes, args);

    after(() => {
        for (const { cleanup } of results) {
            cleanup();
        }
    });

    return results.map(({ port }) => port);
}

interface SpawnRedisClusterNodeResult extends SpawnRedisServerResult {
    client: RedisClientType<RedisModules, RedisLuaScripts>
}

async function spawnRedisClusterNode(
    type: TestRedisClusters | null,
    nodeIndex: number,
    fromSlot: number,
    toSlot: number,
    args?: Array<string>
): Promise<SpawnRedisClusterNodeResult> {
    const clusterConfigFile = `/tmp/${type}-${nodeIndex}.conf`,
        { port, cleanup: originalCleanup } = await spawnRedisServer([
            '--cluster-enabled',
            'yes',
            '--cluster-node-timeout',
            CLUSTER_NODE_TIMEOUT.toString(),
            '--cluster-config-file',
            clusterConfigFile,
            ...(args ?? [])
        ]);

    const client = RedisClient.create({
        socket: {
            port
        }
    });

    await client.connect();

    const range = [];
    for (let i = fromSlot; i < toSlot; i++) {
        range.push(i);
    }

    await Promise.all([
        client.clusterFlushSlots(),
        client.clusterAddSlots(range)
    ]);
    
    return {
        port,
        async cleanup(): Promise<void> {
            await originalCleanup();

            try {
                await unlink(clusterConfigFile);
            } catch (err) {
                if (err.code == 'ENOENT') return;
    
                throw err;
            }
        },
        client
    };
}

export async function waitTillBeenCalled(spy: SinonSpy): Promise<void> {
    const start = process.hrtime.bigint(),
        calls = spy.callCount;

    do {
        if (process.hrtime.bigint() - start > 1_000_000_000) {
            throw new Error('Waiting for more than 1 second');
        }

        await setTimeout(1);
    } while (spy.callCount === calls)
}