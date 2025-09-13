# Supabase Database Information

## Database Constraints

| Table Name | Constraint Name | Definition |
|------------|-----------------|------------|
| api_keys | api_keys_api_key_hash_key | UNIQUE (api_key_hash) |
| api_keys | api_keys_pkey | PRIMARY KEY (id) |
| api_keys | api_keys_user_id_fkey | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE |
| auth.audit_log_entries | audit_log_entries_pkey | PRIMARY KEY (id) |
| auth.flow_state | flow_state_pkey | PRIMARY KEY (id) |
| auth.identities | identities_pkey | PRIMARY KEY (id) |
| auth.identities | identities_provider_id_provider_unique | UNIQUE (provider_id, provider) |
| auth.identities | identities_user_id_fkey | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE |
| auth.instances | instances_pkey | PRIMARY KEY (id) |
| auth.mfa_amr_claims | amr_id_pk | PRIMARY KEY (id) |
| auth.mfa_amr_claims | mfa_amr_claims_session_id_authentication_method_pkey | UNIQUE (session_id, authentication_method) |
| auth.mfa_amr_claims | mfa_amr_claims_session_id_fkey | FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE |
| auth.mfa_challenges | mfa_challenges_auth_factor_id_fkey | FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE |
| auth.mfa_challenges | mfa_challenges_pkey | PRIMARY KEY (id) |
| auth.mfa_factors | mfa_factors_last_challenged_at_key | UNIQUE (last_challenged_at) |
| auth.mfa_factors | mfa_factors_pkey | PRIMARY KEY (id) |
| auth.mfa_factors | mfa_factors_user_id_fkey | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE |
| auth.oauth_clients | oauth_clients_client_id_key | UNIQUE (client_id) |
| auth.oauth_clients | oauth_clients_client_name_length | CHECK ((char_length(client_name) <= 1024)) |
| auth.oauth_clients | oauth_clients_client_uri_length | CHECK ((char_length(client_uri) <= 2048)) |
| auth.oauth_clients | oauth_clients_logo_uri_length | CHECK ((char_length(logo_uri) <= 2048)) |
| auth.oauth_clients | oauth_clients_pkey | PRIMARY KEY (id) |
| auth.one_time_tokens | one_time_tokens_pkey | PRIMARY KEY (id) |
| auth.one_time_tokens | one_time_tokens_token_hash_check | CHECK ((char_length(token_hash) > 0)) |
| auth.one_time_tokens | one_time_tokens_user_id_fkey | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE |
| auth.refresh_tokens | refresh_tokens_pkey | PRIMARY KEY (id) |
| auth.refresh_tokens | refresh_tokens_session_id_fkey | FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE |
| auth.refresh_tokens | refresh_tokens_token_unique | UNIQUE (token) |
| auth.saml_providers | entity_id not empty | CHECK ((char_length(entity_id) > 0)) |
| auth.saml_providers | metadata_url not empty | CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))) |
| auth.saml_providers | metadata_xml not empty | CHECK ((char_length(metadata_xml) > 0)) |
| auth.saml_providers | saml_providers_entity_id_key | UNIQUE (entity_id) |
| auth.saml_providers | saml_providers_pkey | PRIMARY KEY (id) |
| auth.saml_providers | saml_providers_sso_provider_id_fkey | FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE |
| auth.saml_relay_states | request_id not empty | CHECK ((char_length(request_id) > 0)) |
| auth.saml_relay_states | saml_relay_states_flow_state_id_fkey | FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE |
| auth.saml_relay_states | saml_relay_states_pkey | PRIMARY KEY (id) |
| auth.saml_relay_states | saml_relay_states_sso_provider_id_fkey | FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE |
| auth.schema_migrations | schema_migrations_pkey | PRIMARY KEY (version) |
| auth.sessions | sessions_pkey | PRIMARY KEY (id) |
| auth.sessions | sessions_user_id_fkey | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE |
| auth.sso_domains | domain not empty | CHECK ((char_length(domain) > 0)) |
| auth.sso_domains | sso_domains_pkey | PRIMARY KEY (id) |
| auth.sso_domains | sso_domains_sso_provider_id_fkey | FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE |
| auth.sso_providers | resource_id not empty | CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0))) |
| auth.sso_providers | sso_providers_pkey | PRIMARY KEY (id) |
| auth.users | users_email_change_confirm_status_check | CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2))) |
| auth.users | users_phone_key | UNIQUE (phone) |
| auth.users | users_pkey | PRIMARY KEY (id) |
| blog_posts | blog_posts_pkey | PRIMARY KEY (id) |
| blog_posts | blog_posts_slug_key | UNIQUE (slug) |
| chatbots | chatbots_pkey | PRIMARY KEY (id) |
| chatbots | chatbots_user_id_fkey | FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE |
| connections | connections_chatbot_id_fkey | FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE |
| connections | connections_pkey | PRIMARY KEY (id) |
| connections | connections_user_id_fkey | FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE |
| data_sources | data_sources_chatbot_id_fkey | FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE |
| data_sources | data_sources_pkey | PRIMARY KEY (id) |
| error_logs | error_logs_pkey | PRIMARY KEY (id) |
| faqs | faqs_chatbot_id_fkey | FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE |
| faqs | faqs_pkey | PRIMARY KEY (id) |
| messages | messages_chatbot_id_fkey | FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE |
| messages | messages_pkey | PRIMARY KEY (id) |
