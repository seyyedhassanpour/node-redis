import { RedisArgument, ArrayReply, SimpleStringReply, NumberReply, UnwrapReply, Command } from '@redis/client/dist/lib/RESP/types';

export default {
  FIRST_KEY_INDEX: 1,
  IS_READ_ONLY: true,
  transformArguments(key: RedisArgument) {
    return ['TOPK.LIST', key, 'WITHCOUNT'];
  },
  transformReply(rawReply: UnwrapReply<ArrayReply<SimpleStringReply | NumberReply>>) {
    const reply: Array<{
      item: SimpleStringReply;
      count: NumberReply;
    }> = [];
    
    for (let i = 0; i < rawReply.length; i++) {
      reply.push({
        item: rawReply[i] as SimpleStringReply,
        count: rawReply[++i] as NumberReply
      });
    }

    return reply;
  }
} as const satisfies Command;
