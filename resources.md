# Intaj Project Resources Guide

This document serves as a central reference for the Intaj project structure, key files, and important resources. Use this guide to quickly understand the project organization and locate important components.

## Project Structure

### Core Directories

- `/src` - Main application source code
  - `/app` - Next.js application routes and pages
  - `/components` - Reusable React components
  - `/lib` - Utility functions and libraries
  - `/types` - TypeScript type definitions
  - `/data` - Static data and constants
  - `/middleware.ts` - Next.js middleware for authentication and routing

- `/db` - Database related files
  - `database_updates.sql` - SQL schema definitions
  - `DB_DESCRIPTION.md` - Database documentation
  - `analytics_functions.sql` - SQL functions for analytics
  - `vector_search_function.sql` - Vector search implementation
  - Other SQL migration files

- `/public` - Static assets (images, icons, etc.)

- `/docs` - Project documentation
  - API reference and integration guides

- `/supabase` - Supabase configuration and edge functions

### Key Documentation Files

- `implementation_prompts.md` - Detailed implementation instructions for each feature
- `DB_DESCRIPTION.md` - Database schema documentation
- `connection.md` - Integration architecture for multi-channel connections
- `SUPABASE_SETUP.md` - Supabase configuration guide
- `ENV_VARIABLES.md` - Environment variables documentation

## Feature Implementation Locations

### Authentication
- Authentication UI: `/src/app/auth/`
- Auth middleware: `/src/middleware.ts`
- Supabase auth helpers: `/src/lib/supabaseClient.ts`

### Dashboard
- Main dashboard: `/src/app/dashboard/page.tsx`
- Onboarding checklist: `/src/components/onboarding/OnboardingChecklist.tsx`
- Onboarding flow: `/src/components/onboarding/OnboardingFlow.tsx`

### Chatbots
- Chatbot list: `/src/app/dashboard/chatbots/page.tsx`
- Chatbot edit page: `/src/app/dashboard/chatbots/[id]/page.tsx`
- Chatbot form component: `/src/components/chatbot/ChatbotForm.tsx`

### Data Sources
- Data sources management: `/src/app/dashboard/chatbots/data-sources/`
- Add data source dialog: `/src/components/add-data-source-dialog.tsx`
- Data source actions: `/src/app/dashboard/chatbots/data-sources/actions.ts`

### Connections
- Connections page: `/src/app/connections/page.tsx`
- Connection wizard: `/src/components/connections/ConnectionWizard.tsx`
- API routes for connections: `/src/app/api/connections/`

### Analytics
- Analytics page: `/src/app/analytics/page.tsx`
- Analytics functions: `/db/analytics_functions.sql`

## Database Schema

The database schema is defined in `/db/DB_DESCRIPTION.md` and includes the following main tables:

- `profiles` - User profiles linked to Supabase auth.users
- `chatbots` - Chatbot configurations
- `messages` - Chat history between users and bots
- `data_sources` - Knowledge sources for chatbots
- `connections` - Integration channels (WhatsApp, Facebook, etc.)
- `embeddings` - Vector embeddings for knowledge retrieval

## Important SQL Migrations

### Onboarding Steps Migration

This SQL adds the onboarding_steps column to the profiles table:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{
  "created_first_chatbot": false,
  "added_data_source": false,
  "connected_channel": false,
  "has_dismissed": false
}';
```

## Implementation Prompts Outputs

### Prompt 17: Multi-Step Connection Wizard

Implemented a multi-step connection wizard that allows users to connect various communication channels:

- Created `ConnectionWizard.tsx` component with step-by-step UI
- Added API routes for OAuth and API key connections
- Implemented secure credential storage in the database
- Added progress tracking for onboarding checklist

### Prompt 18: Backend for Telegram and Slack Integrations

Implemented backend logic for Telegram and Slack integrations:

- Created API routes for handling webhook events
- Added secure token storage and verification
- Implemented message handling and routing
- Added channel selection for Slack workspaces

### Prompt 19: Core Chatbot Management UI

Implemented the core chatbot management interface:

- Created chatbot list view with creation and editing capabilities
- Added form fields for name, avatar, and status
- Implemented secure database operations with user ownership checks
- Added deletion confirmation dialog

### Prompt 20: Data Sources and Vector Search

Implemented data source management and vector search:

- Created tabbed interface with General, Personality & Model, and Data Sources tabs
- Added data source types (website, file, text) with appropriate input methods
- Implemented vector embedding generation and storage
- Added data source processing status tracking

### Prompt 21: User Onboarding Checklist

Implemented user onboarding checklist to guide new users:

- Added onboarding_steps column to profiles table
- Created OnboardingChecklist.tsx component with step indicators
- Integrated checklist into dashboard page
- Added automatic progress tracking in ChatbotForm, Add Data Source dialog, and ConnectionWizard
- Implemented dismiss functionality with user preference saving

## Development Workflow

1. Use `implementation_prompts.md` for detailed feature requirements
2. Reference `DB_DESCRIPTION.md` for database schema
3. Check `/docs` for integration guides
4. Follow the project structure for consistent implementation