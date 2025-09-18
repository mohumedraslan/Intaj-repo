// Unified cross-channel messaging types

export type Channel = 'website' | 'telegram' | 'whatsapp' | 'facebook' | 'instagram' | 'slack' | 'discord';
export type Direction = 'inbound' | 'outbound';
export type Role = 'user' | 'agent' | 'system';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'file' | 'location' | 'sticker' | 'event' | 'template';
export type Status = 'received' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'resolved';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface Attachment {
  type: 'image' | 'audio' | 'video' | 'file' | 'location' | 'other';
  url?: string;
  name?: string;
  size?: number;
  mime?: string;
  meta?: Record<string, any>;
}

export interface Message {
  id?: string;

  // Ownership/context
  user_id?: string | null;
  agent_id?: string | null;
  connection_id?: string | null;

  // Conversation
  conversation_id?: string | null;
  chat_id?: string | null;
  thread_id?: string | null;

  // Channel/platform
  channel: Channel;
  platform?: Channel; // kept for backward compatibility

  // Semantics
  direction: Direction; // inbound=user->agent, outbound=agent->user
  role?: Role; // user | agent | system

  // Legacy fields for compatibility
  /** @deprecated prefer role */
  sender_type?: 'user' | 'agent' | string | null;
  sender_name?: string | null;

  // Content
  message_type: MessageType;
  /** @deprecated prefer content_text */
  content?: string | null;
  content_text?: string | null;
  content_json?: any;
  attachments?: Attachment[] | null;

  // External linkage
  external_id?: string | null; // legacy
  external_message_id?: string | null; // preferred
  external_conversation_id?: string | null;
  sender_external_id?: string | null;

  // Delivery/state
  status?: Status;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;

  // Analytics/labels
  sentiment?: Sentiment | null;
  tags?: string[] | null;

  // Misc
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}
