# Terminology Update: Chatbot → Agent

## Overview

This document outlines the changes made to update terminology across the codebase from "chatbot" to "agent".

## Changes Made

1. **Frontend Code Updates**:
   - Updated all UI components to use "agent" terminology
   - Fixed references in component props and interfaces
   - Updated function parameters and variable names
   - Modified text content in UI elements

2. **Database Schema Updates**:
   - Created migration script: `supabase/migrations/20240701000000_update_chatbot_to_agent_terminology.sql`
   - This script renames tables, columns, constraints, and policies

## How to Apply Changes

### Frontend Changes

The frontend code changes have been applied directly to the codebase. Run the development server to verify:

```bash
npm run dev
```

### Database Changes

To apply the database schema changes, run the migration script using Supabase CLI:

```bash
supabase migration up
```

Or apply it directly to your database:

```bash
psql -U postgres -d your_database_name -f supabase/migrations/20240701000000_update_chatbot_to_agent_terminology.sql
```

## Verification Steps

1. **Check UI**:
   - Verify all UI elements show "agent" instead of "chatbot"
   - Test creating a new agent
   - Test editing an existing agent
   - Test data sources functionality
   - Test widget embed code

2. **Check Database**:
   - Verify table names have been updated
   - Verify foreign key constraints are working
   - Verify RLS policies are applied correctly

## Known Issues

- The migration script should be tested in a development environment before applying to production
- Some third-party integrations might still use the old terminology
- API clients may need to be updated to use the new endpoints

## Additional Notes

- After applying the database changes, you may need to clear your browser cache
- The storage bucket for avatars has been renamed from "chatbot-avatars" to "agent-avatars"
- Onboarding steps in user profiles have been updated to use the new terminology