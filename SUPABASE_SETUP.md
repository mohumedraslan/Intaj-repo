# Supabase Project Setup Checklist (Intaj)

Follow these steps to set up Supabase for the Intaj project.

---

## 1. Create Supabase Project

- Go to https://app.supabase.com and create a new project.
- Choose a strong password and region.

## 2. Add Database Schema

- In the Supabase dashboard, go to SQL Editor.
- Paste and run the contents of `db/database_updates.sql` to create all tables and indices.

## 3. Enable Extensions

- Enable `pgcrypto` (for gen_random_uuid):
  ```sql
  create extension if not exists pgcrypto;
  ```
- (Optional, for vector search) Enable `pgvector`:
  ```sql
  create extension if not exists vector;
  ```

## 4. Enable Row Level Security (RLS)

- For each table, enable RLS in the Table Editor.
- Example: For `messages` and `chatbots`, only allow owners to read/write.

### Example RLS Policy (messages):

```sql
-- Only allow users to access their own chatbot messages
CREATE POLICY "User can access own messages" ON messages
  FOR ALL
  USING (
    chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid())
  );
```

### Example RLS Policy (chatbots):

```sql
-- Only allow users to access their own chatbots
CREATE POLICY "User can access own chatbots" ON chatbots
  FOR ALL
  USING (
    user_id = auth.uid()
  );
```

## 5. Create Storage Bucket

- In Storage, create a bucket (e.g., `data-sources`) for file uploads.

## 6. Get API Keys

- Go to Project Settings > API.
- Copy the following keys:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` (server only)

## 7. Add to `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## 8. Security Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client/browser.
- Always use RLS for all user data tables.
- Encrypt sensitive data before storing in the database.

---

# Done! Your Supabase backend is ready for Intaj.
