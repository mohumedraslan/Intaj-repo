import type { Message } from '@/types/messages';

export interface AdapterContext {
  user_id?: string | null;
  agent_id?: string | null;
  connection_id?: string | null;
}

export interface BaseAdapter {
  // Map raw platform payload -> unified Message (partial insert payload)
  mapIncoming(raw: any, ctx: AdapterContext): Partial<Message>;
  // Map unified Message -> platform-specific payload for sending
  mapOutgoing(msg: Message): any;
}
