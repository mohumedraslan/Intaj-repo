-- Create initial schema for chatbots
CREATE TABLE IF NOT EXISTS chatbots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy for selecting messages (users can only see their own messages)
CREATE POLICY "Users can view their own messages" 
  ON messages 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for inserting messages (users can only create messages for themselves)
CREATE POLICY "Users can create their own messages" 
  ON messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on connections table
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Create policy for selecting connections (users can only see their own connections)
CREATE POLICY "Users can view their own connections" 
  ON connections 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for inserting connections (users can only create connections for themselves)
CREATE POLICY "Users can create their own connections" 
  ON connections 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy for updating connections (users can only update their own connections)
CREATE POLICY "Users can update their own connections" 
  ON connections 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy for deleting connections (users can only delete their own connections)
CREATE POLICY "Users can delete their own connections" 
  ON connections 
  FOR DELETE 
  USING (auth.uid() = user_id);