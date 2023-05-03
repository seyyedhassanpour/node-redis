import { strict as assert } from 'assert';
import testUtils, { GLOBAL } from '../test-utils';
import SPOP from './SPOP';

describe('SPOP', () => {
  it('transformArguments', () => {
    assert.deepEqual(
      SPOP.transformArguments('key'),
      ['SPOP', 'key']
    );
  });

  testUtils.testAll('sPop', async client => {
    assert.equal(
      await client.sPop('key'),
      null
    );
  }, {
    client: GLOBAL.SERVERS.OPEN,
    cluster: GLOBAL.CLUSTERS.OPEN
  });
});
