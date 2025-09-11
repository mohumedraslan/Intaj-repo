-- Add base_prompt and model columns to chatbots table
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS base_prompt TEXT,
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o';

-- Create data_sources table
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('website', 'file', 'text')),
  content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'training', 'ready', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for data_sources table
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

-- Create policy for selecting data_sources (users can only see their own data sources)
CREATE POLICY "Users can view their own data sources" 
  ON data_sources 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for inserting data_sources (users can only create data sources for themselves)
CREATE POLICY "Users can create their own data sources" 
  ON data_sources 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy for updating data_sources (users can only update their own data sources)
CREATE POLICY "Users can update their own data sources" 
  ON data_sources 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy for deleting data_sources (users can only delete their own data sources)
CREATE POLICY "Users can delete their own data sources" 
  ON data_sources 
  FOR DELETE 
  USING (auth.uid() = user_id);