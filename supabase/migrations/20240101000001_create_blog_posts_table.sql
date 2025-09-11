-- Create blog_posts table
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  author_id UUID,
  published_at TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to published blog posts
DROP POLICY IF EXISTS "Allow public read access to published blog posts" ON blog_posts;
CREATE POLICY "Allow public read access to published blog posts" 
  ON blog_posts 
  FOR SELECT 
  TO anon 
  USING (is_published = TRUE);

-- Create policy for authenticated users to manage blog posts
DROP POLICY IF EXISTS "Allow authenticated users to manage blog posts" ON blog_posts;
CREATE POLICY "Allow authenticated users to manage blog posts" 
  ON blog_posts 
  FOR ALL 
  TO authenticated 
  USING (TRUE);