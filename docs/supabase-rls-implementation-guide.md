   # Supabase Row Level Security (RLS) Implementation Guide

   ## Overview

   This guide explains the security fixes implemented to address the Row Level Security (RLS) issues identified in the Supabase security lints. RLS is a critical security feature that restricts which rows in a database table a user can access, based on their identity or role.

   ## Issues Fixed

   The following tables in the public schema had RLS disabled, which posed a security risk:

   1. `usage_stats`
   2. `two_factor_setup`
   3. `subscription_tiers`
   4. `user_usage`
   5. `usage_notifications`
   6. `user_notifications`
   7. `error_logs`
   8. `recovery_logs`
   9. `oauth_states`

   ## Implementation Details

   A new migration file has been created at `db/migrations/enable_rls_on_public_tables.sql` that:

   1. Enables RLS on all affected tables
   2. Creates appropriate RLS policies for each table based on its purpose

   ### Policy Types Implemented

   - **User-specific data**: Policies that allow users to only access their own data (using `auth.uid() = user_id`)
   - **Public data**: Policies that allow all authenticated users to view certain data (using `true` condition)
   - **Admin-only data**: Policies that restrict access to users with admin role

   ## How to Apply These Changes

   ### Option 1: Run the Migration File

   Execute the SQL migration file against your Supabase database:

   ```bash
   # Using Supabase CLI
   supabase db push --db-url=<your-db-url> db/migrations/enable_rls_on_public_tables.sql

   # Or directly through psql
   psql -h <host> -U <user> -d <database> -f db/migrations/enable_rls_on_public_tables.sql
   ```

   ### Option 2: Apply Through Supabase Dashboard

   1. Log in to your Supabase dashboard
   2. Navigate to the SQL Editor
   3. Copy the contents of `db/migrations/enable_rls_on_public_tables.sql`
   4. Paste into the SQL Editor and run the query

   ## Verifying the Changes

   After applying the changes, you can verify that RLS is enabled:

   1. In the Supabase dashboard, go to the Table Editor
   2. Select each table mentioned above
   3. Check the "RLS Policies" tab to confirm that:
      - RLS is enabled
      - The appropriate policies are in place

   ## Additional Security Recommendations

   1. **Regular Audits**: Periodically run the Supabase linter to check for new security issues
   2. **Test Access**: Create test users with different roles to verify that the RLS policies work as expected
   3. **Backup**: Always backup your database before applying security changes

   ## Troubleshooting

   If you encounter issues after implementing RLS:

   1. **Authentication Problems**: Ensure your application is correctly setting the user's JWT token
   2. **Missing Data**: Check if your RLS policies might be too restrictive
   3. **Errors**: Look for syntax errors in the SQL migration

   ## Related Documentation

   - [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
   - [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)