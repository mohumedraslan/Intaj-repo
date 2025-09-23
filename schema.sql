-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.agent_workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  triggers jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 1,
  execution_count integer DEFAULT 0,
  last_executed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agent_workflows_pkey PRIMARY KEY (id),
  CONSTRAINT agent_workflows_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id),
  CONSTRAINT agent_workflows_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  model text NOT NULL,
  settings jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  avatar_url text,
  base_prompt text,
  status text DEFAULT 'active'::text,
  updated_at timestamp with time zone DEFAULT now(),
  agent_type text,
  CONSTRAINT agents_pkey PRIMARY KEY (id),
  CONSTRAINT chatbots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  key_name text NOT NULL,
  api_key_hash text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text,
  author_id uuid,
  published_at timestamp with time zone,
  is_published boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blog_posts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  agent_id uuid,
  platform text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'inactive'::text, 'error'::text])),
  config jsonb DEFAULT '{}'::jsonb,
  name text,
  updated_at timestamp with time zone DEFAULT now(),
  credentials jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT connections_pkey PRIMARY KEY (id),
  CONSTRAINT connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT connections_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  agent_id uuid,
  connection_id uuid,
  channel text NOT NULL CHECK (channel = ANY (ARRAY['website'::text, 'telegram'::text, 'whatsapp'::text, 'facebook'::text, 'instagram'::text, 'slack'::text, 'discord'::text])),
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'pending'::text, 'resolved'::text, 'closed'::text])),
  chat_id text,
  first_message_at timestamp with time zone DEFAULT now(),
  last_message_at timestamp with time zone,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  platform character varying,
  platform_user_id character varying,
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT conversations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id),
  CONSTRAINT conversations_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id)
);
CREATE TABLE public.data_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid,
  type text NOT NULL,
  path text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  content text,
  status text DEFAULT 'pending'::text,
  CONSTRAINT data_sources_pkey PRIMARY KEY (id),
  CONSTRAINT data_sources_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT data_sources_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id)
);
CREATE TABLE public.document_chunks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  agent_id uuid NOT NULL,
  document_id text NOT NULL,
  kb_document_id uuid,
  content text NOT NULL,
  embedding USER-DEFINED,
  metadata jsonb DEFAULT '{}'::jsonb,
  chunk_index integer NOT NULL,
  total_chunks integer NOT NULL,
  token_count integer NOT NULL,
  start_offset integer DEFAULT 0,
  end_offset integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT document_chunks_pkey PRIMARY KEY (id),
  CONSTRAINT document_chunks_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id),
  CONSTRAINT document_chunks_kb_document_id_fkey FOREIGN KEY (kb_document_id) REFERENCES public.knowledge_base_documents(id)
);
CREATE TABLE public.error_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  error_type text NOT NULL,
  message text NOT NULL,
  stack_trace text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  error_message text,
  CONSTRAINT error_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chatbot_id uuid,
  question text NOT NULL,
  answer text NOT NULL,
  CONSTRAINT faqs_pkey PRIMARY KEY (id),
  CONSTRAINT faqs_chatbot_id_fkey FOREIGN KEY (chatbot_id) REFERENCES public.agents(id)
);
CREATE TABLE public.knowledge_base_document_versions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  document_id uuid NOT NULL,
  version integer NOT NULL,
  filename text NOT NULL,
  file_size bigint NOT NULL,
  chunks_count integer DEFAULT 0,
  tokens_count integer DEFAULT 0,
  processing_result jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_base_document_versions_pkey PRIMARY KEY (id),
  CONSTRAINT knowledge_base_document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.knowledge_base_documents(id)
);
CREATE TABLE public.knowledge_base_documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  agent_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  filename text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text, 'deleted'::text])),
  chunks_count integer DEFAULT 0,
  tokens_count integer DEFAULT 0,
  embeddings_count integer DEFAULT 0,
  processing_time integer,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  version integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_base_documents_pkey PRIMARY KEY (id),
  CONSTRAINT knowledge_base_documents_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id),
  CONSTRAINT knowledge_base_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.llm_usage_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  agent_id uuid,
  conversation_id uuid,
  message_id text,
  provider text NOT NULL,
  model text NOT NULL,
  tokens_input integer NOT NULL DEFAULT 0,
  tokens_output integer NOT NULL DEFAULT 0,
  tokens_total integer NOT NULL DEFAULT 0,
  cost_usd numeric,
  latency_ms integer NOT NULL,
  request_id text,
  response_status text NOT NULL CHECK (response_status = ANY (ARRAY['success'::text, 'error'::text, 'timeout'::text])),
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT llm_usage_logs_pkey PRIMARY KEY (id),
  CONSTRAINT llm_usage_logs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  connection_id uuid,
  conversation_id uuid,
  channel text CHECK (channel = ANY (ARRAY['website'::text, 'telegram'::text, 'whatsapp'::text, 'facebook'::text, 'instagram'::text, 'slack'::text, 'discord'::text])),
  platform text CHECK (platform = ANY (ARRAY['website'::text, 'telegram'::text, 'whatsapp'::text, 'facebook'::text, 'instagram'::text, 'slack'::text, 'discord'::text])),
  chat_id text,
  thread_id text,
  direction text DEFAULT 'inbound'::text CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text])),
  sender_type text,
  sender_name text,
  message_type text DEFAULT 'text'::text CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'audio'::text, 'video'::text, 'file'::text, 'location'::text, 'sticker'::text, 'event'::text, 'template'::text])),
  content_text text,
  content_json jsonb,
  attachments jsonb,
  external_id text,
  external_message_id text,
  external_conversation_id text,
  sender_external_id text,
  status text DEFAULT 'received'::text CHECK (status = ANY (ARRAY['received'::text, 'queued'::text, 'sent'::text, 'delivered'::text, 'read'::text, 'failed'::text, 'resolved'::text])),
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  sentiment text CHECK (sentiment = ANY (ARRAY['positive'::text, 'neutral'::text, 'negative'::text])),
  tags ARRAY,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  platform_message_id character varying,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT messages_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id),
  CONSTRAINT messages_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.oauth_states (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  state text NOT NULL,
  platform text NOT NULL,
  chatbot_id uuid,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT oauth_states_pkey PRIMARY KEY (id),
  CONSTRAINT oauth_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT oauth_states_chatbot_id_fkey FOREIGN KEY (chatbot_id) REFERENCES public.agents(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL UNIQUE,
  subscription text NOT NULL DEFAULT 'free'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  stripe_customer_id text,
  subscription_id text,
  subscription_status text,
  two_factor_enabled boolean DEFAULT false,
  two_factor_secret text,
  two_factor_backup_codes ARRAY,
  two_factor_recovery_codes ARRAY,
  onboarding_steps jsonb DEFAULT '{"has_dismissed": false, "added_data_source": false, "connected_channel": false, "created_first_chatbot": false}'::jsonb,
  role text NOT NULL DEFAULT 'user'::text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recovery_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  error_log_id uuid,
  recovery_type text NOT NULL,
  success boolean NOT NULL,
  attempts integer DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT recovery_logs_pkey PRIMARY KEY (id),
  CONSTRAINT recovery_logs_error_log_id_fkey FOREIGN KEY (error_log_id) REFERENCES public.error_logs(id)
);
CREATE TABLE public.subscription_tiers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  api_rate_limit integer NOT NULL,
  daily_message_limit integer NOT NULL,
  monthly_message_limit integer NOT NULL,
  file_upload_limit integer NOT NULL,
  file_size_limit integer NOT NULL,
  max_chatbots integer NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT subscription_tiers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_bots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  user_id uuid NOT NULL,
  bot_token text NOT NULL,
  bot_username text NOT NULL,
  webhook_url text,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_bots_pkey PRIMARY KEY (id),
  CONSTRAINT telegram_bots_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id),
  CONSTRAINT telegram_bots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.two_factor_setup (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  secret text NOT NULL,
  qr_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '00:10:00'::interval),
  CONSTRAINT two_factor_setup_pkey PRIMARY KEY (id),
  CONSTRAINT two_factor_setup_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.usage_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usage_logs_pkey PRIMARY KEY (id),
  CONSTRAINT usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT usage_logs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id)
);
CREATE TABLE public.usage_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  month text NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usage_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT usage_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.usage_notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  type text NOT NULL,
  message text NOT NULL,
  seen boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT usage_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT usage_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.usage_stats (
  user_id uuid NOT NULL,
  month date NOT NULL,
  total_usage integer DEFAULT 0,
  limit_reached boolean DEFAULT false,
  CONSTRAINT usage_stats_pkey PRIMARY KEY (month, user_id),
  CONSTRAINT usage_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_2fa_secrets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  secret text NOT NULL,
  enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_2fa_secrets_pkey PRIMARY KEY (id),
  CONSTRAINT user_2fa_secrets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  type text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  seen boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  onboarding_steps jsonb DEFAULT '{"has_dismissed": false, "added_data_source": false, "connected_channel": false, "created_first_agent": false}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_usage (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  api_calls_count integer DEFAULT 0,
  api_calls_last_reset timestamp with time zone DEFAULT timezone('utc'::text, now()),
  daily_messages_count integer DEFAULT 0,
  daily_messages_last_reset timestamp with time zone DEFAULT timezone('utc'::text, now()),
  monthly_messages_count integer DEFAULT 0,
  monthly_messages_last_reset timestamp with time zone DEFAULT timezone('utc'::text, now()),
  file_upload_total bigint DEFAULT 0,
  file_upload_last_reset timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_usage_pkey PRIMARY KEY (id),
  CONSTRAINT user_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.vectors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chatbot_id uuid,
  source_type text NOT NULL,
  source_id uuid,
  content text NOT NULL,
  embedding USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vectors_pkey PRIMARY KEY (id),
  CONSTRAINT vectors_chatbot_id_fkey FOREIGN KEY (chatbot_id) REFERENCES public.agents(id)
);
CREATE TABLE public.whatsapp_bots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  user_id uuid NOT NULL,
  phone_number_id text NOT NULL,
  access_token text NOT NULL,
  webhook_verify_token text NOT NULL,
  business_account_id text NOT NULL,
  phone_number text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text])),
  support_mode text NOT NULL DEFAULT 'hybrid'::text CHECK (support_mode = ANY (ARRAY['auto'::text, 'hybrid'::text, 'manual'::text])),
  business_hours jsonb NOT NULL DEFAULT '{"enabled": true, "schedule": {}, "timezone": "UTC"}'::jsonb,
  auto_responses jsonb NOT NULL DEFAULT '{"welcome_message": "", "fallback_message": "", "business_hours_message": ""}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT whatsapp_bots_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_bots_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id),
  CONSTRAINT whatsapp_bots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  user_id uuid NOT NULL,
  whatsapp_bot_id uuid NOT NULL,
  whatsapp_user_id text NOT NULL,
  whatsapp_user_name text,
  message_type text NOT NULL CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'document'::text, 'audio'::text, 'video'::text, 'location'::text, 'contact'::text])),
  message_content text NOT NULL,
  direction text NOT NULL CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text])),
  is_ai_response boolean DEFAULT false,
  response_time_seconds numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_messages_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id),
  CONSTRAINT whatsapp_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT whatsapp_messages_whatsapp_bot_id_fkey FOREIGN KEY (whatsapp_bot_id) REFERENCES public.whatsapp_bots(id)
);
CREATE TABLE public.widget_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chatbot_id uuid,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT widget_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT widget_sessions_chatbot_id_fkey FOREIGN KEY (chatbot_id) REFERENCES public.agents(id)
);
CREATE TABLE public.workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  chatbot_id uuid,
  name text NOT NULL,
  definition jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workflows_pkey PRIMARY KEY (id),
  CONSTRAINT workflows_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT workflows_chatbot_id_fkey FOREIGN KEY (chatbot_id) REFERENCES public.agents(id)
);