-- Add new columns to chatbots table
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update existing chatbots to have default status in settings
UPDATE chatbots
SET settings = settings || '{"status": "active"}'::jsonb
WHERE settings IS NULL OR NOT settings ? 'status';