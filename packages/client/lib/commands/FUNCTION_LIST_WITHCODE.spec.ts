import { strict as assert } from 'assert';
import testUtils, { GLOBAL } from '../test-utils';
import FUNCTION_LIST_WITHCODE from './FUNCTION_LIST_WITHCODE';
import { MATH_FUNCTION, loadMathFunction } from './FUNCTION_LOAD.spec';

describe('FUNCTION LIST WITHCODE', () => {
  testUtils.isVersionGreaterThanHook([7]);

  describe('transformArguments', () => {
    it('simple', () => {
      assert.deepEqual(
        FUNCTION_LIST_WITHCODE.transformArguments(),
        ['FUNCTION', 'LIST', 'WITHCODE']
      );
    });

    it('with LIBRARYNAME', () => {
      assert.deepEqual(
        FUNCTION_LIST_WITHCODE.transformArguments({
          LIBRARYNAME: 'patter*'
        }),
        ['FUNCTION', 'LIST', 'LIBRARYNAME', 'patter*', 'WITHCODE']
      );
    });
  });

  testUtils.testWithClient('client.functionListWithCode', async client => {
    await loadMathFunction(client);
    
    assert.deepEqual(
      await client.functionListWithCode(),
      [{
        library_name: MATH_FUNCTION.name,
        engine: MATH_FUNCTION.engine,
        functions: [{
          name: MATH_FUNCTION.library.square.NAME,
          description: null,
          flags: ['no-writes']
        }],
        library_code: MATH_FUNCTION.code
      }]
    );
  }, GLOBAL.SERVERS.OPEN);
});