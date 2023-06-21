import { SimpleStringReply, Command } from '../RESP/types';

export const CLUSTER_SLOT_STATES = {
  IMPORTING: 'IMPORTING',
  MIGRATING: 'MIGRATING',
  STABLE: 'STABLE',
  NODE: 'NODE'
} as const;

export type ClusterSlotStates = typeof CLUSTER_SLOT_STATES[keyof typeof CLUSTER_SLOT_STATES];

export default {
  FIRST_KEY_INDEX: undefined,
  IS_READ_ONLY: true,
  transformArguments(slot: number, state: ClusterSlotStates, nodeId?: string) {
    const args = ['CLUSTER', 'SETSLOT', slot.toString(), state];

    if (nodeId) {
      args.push(nodeId);
    }

    return args;
  },
  transformReply: undefined as unknown as () => SimpleStringReply<'OK'>
} as const satisfies Command;
