import type { BaseAdapter, AdapterContext } from '@/adapters/baseAdapter';
import type { Message } from '@/types/messages';

export const WhatsAppAdapter: BaseAdapter = {
  mapIncoming(_raw: any, _ctx: AdapterContext): Partial<Message> {
    throw new Error('Not implemented');
  },
  mapOutgoing(_msg: Message): any {
    throw new Error('Not implemented');
  }
};
