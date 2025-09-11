-- Add missing description column to chatbots table if it doesn't exist
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure the storage bucket exists for chatbot avatars
-- Commented out as we don't have permission to insert into storage.buckets
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('chatbot-avatars', 'chatbot-avatars', true)
-- ON CONFLICT DO NOTHING;