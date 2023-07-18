import { strict as assert } from 'assert';
import testUtils, { GLOBAL } from '../test-utils';
import ARRTRIM from './ARRTRIM';

describe('JSON.ARRTRIM', () => {
  it('transformArguments', () => {
    assert.deepEqual(
      ARRTRIM.transformArguments('key', '$', 0, 1),
      ['JSON.ARRTRIM', 'key', '$', '0', '1']
    );
  });

  testUtils.testWithClient('client.json.arrTrim', async client => {
    const [, reply] = await Promise.all([
      client.json.set('key', '$', []),
      client.json.arrTrim('key', '$', 0, 1)
    ]);

    assert.deepEqual(reply, [0]);
  }, GLOBAL.SERVERS.OPEN);
});
