-- Unified Messaging Schema Migration
-- 1) Create conversations first (includes chat_id for platform chat/thread binding)
-- 2) Alter existing messages table to add unified fields + FK to conversations
-- 3) Add indexes and RLS policies

-- Enable pgcrypto if not already enabled (for gen_random_uuid)
create extension if not exists pgcrypto;

-- 1) Conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  connection_id uuid references public.connections(id) on delete set null,
  channel text not null check (channel in ('website','telegram','whatsapp','facebook','instagram','slack','discord')),
  status text not null default 'open' check (status in ('open','pending','resolved','closed')),
  chat_id text, -- platform chat/thread id for quick lookup
  first_message_at timestamptz default now(),
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Alter existing messages table to add unified fields (keep legacy fields for compatibility)
-- If messages table does not exist yet in your environment, you may create it first separately.

-- Ownership/context
alter table public.messages add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.messages add column if not exists agent_id uuid references public.agents(id) on delete set null;
alter table public.messages add column if not exists connection_id uuid references public.connections(id) on delete set null;
alter table public.messages add column if not exists conversation_id uuid;

-- Channel/platform
alter table public.messages add column if not exists channel text check (channel in ('website','telegram','whatsapp','facebook','instagram','slack','discord'));
alter table public.messages add column if not exists platform text check (platform in ('website','telegram','whatsapp','facebook','instagram','slack','discord'));

-- Addressing
alter table public.messages add column if not exists chat_id text;
alter table public.messages add column if not exists thread_id text;

-- Direction/role
alter table public.messages add column if not exists direction text default 'inbound' check (direction in ('inbound','outbound'));
alter table public.messages add column if not exists role text check (role in ('user','agent','system'));

-- Legacy sender_type/sender_name may already exist; add if missing
alter table public.messages add column if not exists sender_type text;
alter table public.messages add column if not exists sender_name text;

-- Content
alter table public.messages add column if not exists message_type text default 'text' check (
  message_type in ('text','image','audio','video','file','location','sticker','event','template')
);
alter table public.messages add column if not exists content text;
alter table public.messages add column if not exists content_text text;
alter table public.messages add column if not exists content_json jsonb;
alter table public.messages add column if not exists attachments jsonb;

-- External linkage
alter table public.messages add column if not exists external_id text;
alter table public.messages add column if not exists external_message_id text;
alter table public.messages add column if not exists external_conversation_id text;
alter table public.messages add column if not exists sender_external_id text;

-- Delivery/state
alter table public.messages add column if not exists status text default 'received' check (status in ('received','queued','sent','delivered','read','failed','resolved'));
alter table public.messages add column if not exists sent_at timestamptz;
alter table public.messages add column if not exists delivered_at timestamptz;
alter table public.messages add column if not exists read_at timestamptz;

-- Analytics/labels
alter table public.messages add column if not exists sentiment text check (sentiment in ('positive','neutral','negative'));
alter table public.messages add column if not exists tags text[];

-- Misc
alter table public.messages add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.messages add column if not exists created_at timestamptz not null default now();
alter table public.messages add column if not exists updated_at timestamptz not null default now();

-- Add FK to conversations (guard if already exists)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.messages'::regclass
      and conname = 'messages_conversation_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_conversation_id_fkey
      foreign key (conversation_id) references public.conversations(id) on delete set null;
  end if;
end $$;

-- 3) Indexes (order matters; references must exist)
create index if not exists idx_messages_conversation_created_at on public.messages(conversation_id, created_at desc);
create index if not exists idx_messages_agent_created_at on public.messages(agent_id, created_at desc);
create index if not exists idx_messages_channel_created_at on public.messages(channel, created_at desc);
create index if not exists idx_messages_platform_created_at on public.messages(platform, created_at desc);
create index if not exists idx_messages_external_id on public.messages(external_id);
create index if not exists idx_messages_chat_id on public.messages(chat_id);

create index if not exists idx_conversations_agent_status on public.conversations(agent_id, status);
create index if not exists idx_conversations_channel_status on public.conversations(channel, status);
create index if not exists idx_conversations_chat_id on public.conversations(chat_id);
create index if not exists idx_conversations_last_message_at on public.conversations(last_message_at desc);

-- Documentation
comment on table public.conversations is 'Logical conversation entity grouping messages across a channel/connection.';
comment on column public.conversations.user_id is 'Owner app user (auth.users.id). Optional for anonymous website chats.';
comment on column public.conversations.agent_id is 'Agent assigned/owning the conversation.';
comment on column public.conversations.connection_id is 'Specific platform connection used by this conversation.';
comment on column public.conversations.channel is 'Channel discriminator: website|telegram|whatsapp|facebook|instagram|slack|discord.';
comment on column public.conversations.status is 'open|pending|resolved|closed.';
comment on column public.conversations.chat_id is 'Platform chat/thread id used to correlate to an ongoing conversation.';
comment on column public.conversations.first_message_at is 'Timestamp of the first message in this conversation.';
comment on column public.conversations.last_message_at is 'Timestamp of the most recent message in this conversation.';
comment on column public.conversations.metadata is 'Free-form JSON to store channel-specific or business data.';

comment on table public.messages is 'Unified, channel-agnostic messages table. Legacy fields retained for compatibility.';
comment on column public.messages.user_id is 'Owner app user (Supabase auth.users.id). Optional for anonymous website chats.';
comment on column public.messages.agent_id is 'Related agent handling the conversation.';
comment on column public.messages.connection_id is 'Specific platform connection (e.g., Telegram bot/WhatsApp number binding).';
comment on column public.messages.conversation_id is 'Logical conversation/thread across multiple messages.';
comment on column public.messages.channel is 'Normalized channel discriminator used across the app (preferred).';
comment on column public.messages.platform is 'Legacy/alternate discriminator used in existing handlers (kept for compatibility).';
comment on column public.messages.chat_id is 'Platform chat identifier (e.g., Telegram chat id).';
comment on column public.messages.thread_id is 'Nested thread id (e.g., Slack thread_ts).';
comment on column public.messages.direction is 'inbound=user→agent, outbound=agent→user.';
comment on column public.messages.role is 'user | agent | system (more granular than sender_type).';
comment on column public.messages.sender_type is 'Deprecated: use role. Kept to avoid breaking existing code paths.';
comment on column public.messages.sender_name is 'Best-effort human-readable sender display name.';
comment on column public.messages.message_type is 'Message payload type (text/image/audio/video/file/location/sticker/event/template).';
comment on column public.messages.content is 'Raw message string where used by legacy paths (deprecated; prefer content_text).';
comment on column public.messages.content_text is 'Normalized text content when available.';
comment on column public.messages.content_json is 'Structured message payload or raw platform body.';
comment on column public.messages.attachments is 'Array of attachments [{type,url,name,size,mime,meta}].';
comment on column public.messages.external_id is 'Legacy platform message id field.';
comment on column public.messages.external_message_id is 'Preferred platform message id field.';
comment on column public.messages.external_conversation_id is 'Platform conversation/ticket id if applicable.';
comment on column public.messages.sender_external_id is 'Platform user id of the sender (e.g., Telegram user id).';
comment on column public.messages.status is 'received|queued|sent|delivered|read|failed|resolved.';
comment on column public.messages.sentiment is 'Optional sentiment label: positive|neutral|negative.';
comment on column public.messages.tags is 'Free-form labels.';
comment on column public.messages.metadata is 'Free-form JSON for channel-specific fields to avoid schema bloat.';
comment on column public.messages.created_at is 'Creation timestamp.';
comment on column public.messages.updated_at is 'Update timestamp.';

-- 4) RLS Policies (Adjust ownership logic to your schema as needed)
alter table public.messages enable row level security;
alter table public.conversations enable row level security;

-- For SELECT: allow if message belongs to current user OR to an agent owned by current user
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_select_policy'
  ) then
    create policy messages_select_policy on public.messages
      for select using (
        user_id = auth.uid()
        or exists (
          select 1 from public.agents a
          where a.id = messages.agent_id and a.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- For INSERT/UPDATE: allow only if targeting a connection owned by current user's agent
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_write_policy'
  ) then
    create policy messages_write_policy on public.messages
      for insert with check (
        exists (
          select 1 from public.agents a
          join public.connections c on c.agent_id = a.id
          where c.id = coalesce(messages.connection_id, c.id) and a.user_id = auth.uid()
        )
      );
    create policy messages_update_policy on public.messages
      for update using (
        exists (
          select 1 from public.agents a
          join public.connections c on c.agent_id = a.id
          where c.id = messages.connection_id and a.user_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from public.agents a
          join public.connections c on c.agent_id = a.id
          where c.id = messages.connection_id and a.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Conversations policies (mirror logic)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'conversations_select_policy'
  ) then
    create policy conversations_select_policy on public.conversations
      for select using (
        user_id = auth.uid()
        or exists (
          select 1 from public.agents a
          where a.id = conversations.agent_id and a.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'conversations_write_policy'
  ) then
    create policy conversations_write_policy on public.conversations
      for insert with check (
        exists (
          select 1 from public.agents a
          join public.connections c on c.agent_id = a.id
          where (conversations.connection_id is null or conversations.connection_id = c.id)
            and a.user_id = auth.uid()
        )
      );
    create policy conversations_update_policy on public.conversations
      for update using (
        exists (
          select 1 from public.agents a
          join public.connections c on c.agent_id = a.id
          where conversations.connection_id = c.id and a.user_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from public.agents a
          join public.connections c on c.agent_id = a.id
          where conversations.connection_id = c.id and a.user_id = auth.uid()
        )
      );
  end if;
end $$;
