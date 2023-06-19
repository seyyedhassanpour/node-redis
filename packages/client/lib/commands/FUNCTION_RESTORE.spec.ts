import { strict as assert } from 'assert';
import testUtils, { GLOBAL } from '../test-utils';
import FUNCTION_RESTORE from './FUNCTION_RESTORE';
import { RESP_TYPES } from '../RESP/decoder';

describe('FUNCTION RESTORE', () => {
  testUtils.isVersionGreaterThanHook([7]);

  describe('transformArguments', () => {
    it('simple', () => {
      assert.deepEqual(
        FUNCTION_RESTORE.transformArguments('dump'),
        ['FUNCTION', 'RESTORE', 'dump']
      );
    });

    it('with mode', () => {
      assert.deepEqual(
        FUNCTION_RESTORE.transformArguments('dump', {
          mode: 'APPEND'
        }),
        ['FUNCTION', 'RESTORE', 'dump', 'APPEND']
      );
    });
  });

  testUtils.testWithClient('client.functionRestore', async client => {
    assert.equal(
      await client.functionRestore(
        await client.withTypeMapping({
          [RESP_TYPES.BLOB_STRING]: Buffer
        }).functionDump(),
        'FLUSH'
      ),
      'OK'
    );
  }, GLOBAL.SERVERS.OPEN);
});