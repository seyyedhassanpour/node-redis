import { Command } from '../RESP/types';
import EVAL, { EvalOptions, transformEvalArguments } from './EVAL';

export default {
  FIRST_KEY_INDEX: EVAL.FIRST_KEY_INDEX,
  IS_READ_ONLY: false,
  transformArguments: transformEvalArguments.bind(undefined, 'FCALL'),
  transformReply: EVAL.transformReply
} as const satisfies Command;