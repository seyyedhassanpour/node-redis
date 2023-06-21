import { strict as assert } from 'assert';
import testUtils, { GLOBAL } from '../test-utils';
import CLUSTER_BUMPEPOCH from './CLUSTER_BUMPEPOCH';

describe('CLUSTER BUMPEPOCH', () => {
  it('transformArguments', () => {
    assert.deepEqual(
      CLUSTER_BUMPEPOCH.transformArguments(),
      ['CLUSTER', 'BUMPEPOCH']
    );
  });

  testUtils.testWithCluster('clusterNode.clusterBumpEpoch', async cluster => {
    const client = await cluster.nodeClient(cluster.masters[0]);
    assert.equal(
      typeof await client.clusterBumpEpoch(),
      'string'
    );
  }, GLOBAL.SERVERS.OPEN);
});
