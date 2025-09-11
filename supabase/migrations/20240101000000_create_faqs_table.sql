-- Create faqs table
CREATE TABLE IF NOT EXISTS faqs (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to published FAQs
DROP POLICY IF EXISTS "Allow public read access to published FAQs" ON faqs;
CREATE POLICY "Allow public read access to published FAQs" 
  ON faqs 
  FOR SELECT 
  TO anon 
  USING (is_published = TRUE);

-- Create policy for authenticated users to manage FAQs
DROP POLICY IF EXISTS "Allow authenticated users to manage FAQs" ON faqs;
CREATE POLICY "Allow authenticated users to manage FAQs" 
  ON faqs 
  FOR ALL 
  TO authenticated 
  USING (TRUE);