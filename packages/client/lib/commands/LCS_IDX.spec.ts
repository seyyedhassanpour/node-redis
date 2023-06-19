import { strict as assert } from 'assert';
import testUtils, { GLOBAL } from '../test-utils';
import LCS_IDX from './LCS_IDX';

describe('LCS IDX', () => {
  testUtils.isVersionGreaterThanHook([7]);

  it('transformArguments', () => {
    assert.deepEqual(
      LCS_IDX.transformArguments('1', '2'),
      ['LCS', '1', '2', 'IDX']
    );
  });

  testUtils.testWithClient('client.lcsIdx', async client => {
    const [, reply] = await Promise.all([
      client.mSet({
        '1': 'abc',
        '2': 'bc'
      }),
      client.lcsIdx('1', '2')
    ]);

    assert.deepEqual(
      reply,
      {
        matches: [
          [[1, 2], [0, 1]]
        ],
        len: 2
      }
    );
  }, GLOBAL.SERVERS.OPEN);
});