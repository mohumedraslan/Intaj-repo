import type { BaseAdapter, AdapterContext } from '@/adapters/baseAdapter';
import type { Attachment, Message } from '@/types/messages';

export const TelegramAdapter: BaseAdapter = {
  mapIncoming(raw: any, ctx: AdapterContext): Partial<Message> {
    const msg = raw?.message ?? raw; // accept either the full webhook or just message

    const attachments: Attachment[] = [];
    let message_type: Message['message_type'] = 'text';
    let content_text: string | undefined = msg?.text;

    if (!content_text) {
      if (Array.isArray(msg?.photo) && msg.photo.length > 0) {
        message_type = 'image';
        const largest = msg.photo[msg.photo.length - 1];
        attachments.push({
          type: 'image',
          url: largest?.file_id ? `telegram:file:${largest.file_id}` : undefined,
          name: 'photo',
          size: largest?.file_size,
          meta: { width: largest?.width, height: largest?.height }
        });
        content_text = '[Photo]';
      } else if (msg?.document) {
        message_type = 'file';
        attachments.push({
          type: 'file',
          url: msg.document.file_id ? `telegram:file:${msg.document.file_id}` : undefined,
          name: msg.document.file_name,
          size: msg.document.file_size,
          mime: msg.document.mime_type
        });
        content_text = `[File] ${msg.document.file_name || ''}`.trim();
      } else if (msg?.voice) {
        message_type = 'audio';
        attachments.push({
          type: 'audio',
          url: msg.voice.file_id ? `telegram:file:${msg.voice.file_id}` : undefined,
          size: msg.voice.file_size,
          mime: 'audio/ogg',
          meta: { duration: msg.voice.duration }
        });
        content_text = '[Voice message]';
      } else {
        message_type = 'event';
        content_text = '[Unsupported/Non-text message]';
      }
    }

    const channel: Message['channel'] = 'telegram';
    const chat_id = msg?.chat?.id ? String(msg.chat.id) : undefined;

    const payload: Partial<Message> = {
      // Context
      user_id: ctx.user_id ?? null,
      agent_id: ctx.agent_id ?? null,
      connection_id: ctx.connection_id ?? null,

      // Channel & addressing
      channel,
      platform: 'telegram',
      chat_id,

      // Semantics
      direction: 'inbound',
      role: 'user',
      sender_type: 'user',
      sender_name: msg?.from?.first_name || 'User',

      // Content
      message_type,
      content: content_text || '[Message]', // legacy
      content_text,
      content_json: msg,
      attachments: attachments.length ? attachments : null,

      // External linkage
      external_id: msg?.message_id ? String(msg.message_id) : undefined,
      external_message_id: msg?.message_id ? String(msg.message_id) : undefined,
      sender_external_id: msg?.from?.id ? String(msg.from.id) : undefined,

      // State
      status: 'received',
      created_at: msg?.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),

      metadata: { telegram: { chat_type: msg?.chat?.type } }
    };

    return payload;
  },

  mapOutgoing(msg: Message): any {
    // Minimal sendMessage payload for Telegram. In practice you would use the Bot API client.
    return {
      method: 'sendMessage',
      chat_id: msg.chat_id,
      text: msg.content_text || msg.content || ''
    };
  }
};
