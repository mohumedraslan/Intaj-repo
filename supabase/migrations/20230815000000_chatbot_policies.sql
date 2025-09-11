-- Create RLS policies for chatbots table

-- Enable RLS on chatbots table
ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;

-- Create policy for selecting chatbots (users can only see their own chatbots)
CREATE POLICY "Users can view their own chatbots" 
  ON chatbots 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for inserting chatbots (users can only create chatbots for themselves)
CREATE POLICY "Users can create their own chatbots" 
  ON chatbots 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy for updating chatbots (users can only update their own chatbots)
CREATE POLICY "Users can update their own chatbots" 
  ON chatbots 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy for deleting chatbots (users can only delete their own chatbots)
CREATE POLICY "Users can delete their own chatbots" 
  ON chatbots 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create storage bucket for chatbot avatars if it doesn't exist
-- Commented out as we don't have permission to insert into storage.buckets
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('chatbot-avatars', 'chatbot-avatars', true)
-- ON CONFLICT DO NOTHING;

-- Enable RLS on storage.objects
-- Commented out as we don't have permission to alter the storage.objects table
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing chatbot avatars (public access)
-- Commented out as we don't have permission to create policies on storage.objects
-- CREATE POLICY "Public can view chatbot avatars"
--   ON storage.objects
--   FOR SELECT
--   USING (bucket_id = 'chatbot-avatars');

-- Create policy for uploading chatbot avatars (authenticated users only)
-- Commented out as we don't have permission to create policies on storage.objects
-- CREATE POLICY "Users can upload chatbot avatars"
--   ON storage.objects
--   FOR INSERT
--   WITH CHECK (
--     bucket_id = 'chatbot-avatars' AND
--     auth.uid() = (storage.foldername(name))[1]::uuid
--   );

-- Create policy for updating chatbot avatars (users can only update their own avatars)
-- Commented out as we don't have permission to create policies on storage.objects
-- CREATE POLICY "Users can update their own chatbot avatars"
--   ON storage.objects
--   FOR UPDATE
--   USING (
--     bucket_id = 'chatbot-avatars' AND
--     auth.uid() = (storage.foldername(name))[1]::uuid
--   );

-- Create policy for deleting chatbot avatars (users can only delete their own avatars)
-- Commented out as we don't have permission to create policies on storage.objects
-- CREATE POLICY "Users can delete their own chatbot avatars"
--   ON storage.objects
--   FOR DELETE
--   USING (
--     bucket_id = 'chatbot-avatars' AND
--     auth.uid() = (storage.foldername(name))[1]::uuid
--   );