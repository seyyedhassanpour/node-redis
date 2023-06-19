import { strict as assert } from 'assert';
import testUtils, { GLOBAL } from '../test-utils';
import LCS_LEN from './LCS_LEN';

describe('LCS_LEN', () => {
  testUtils.isVersionGreaterThanHook([7]);

  it('transformArguments', () => {
    assert.deepEqual(
      LCS_LEN.transformArguments('1', '2'),
      ['LCS', '1', '2', 'LEN']
    );
  });

  testUtils.testAll('lcsLen', async client => {
    assert.equal(
      await client.lcsLen('{tag}1', '{tag}2'),
      0
    );
  }, {
    client: GLOBAL.SERVERS.OPEN,
    cluster: GLOBAL.CLUSTERS.OPEN
  });
});