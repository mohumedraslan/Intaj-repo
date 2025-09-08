-- Error handling schema

-- Error logs table
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type TEXT NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- User notifications table
CREATE TABLE user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    seen BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Auto-recovery log table
CREATE TABLE recovery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_log_id UUID REFERENCES error_logs(id),
    recovery_type TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    attempts INTEGER DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Function to clean up old error logs
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS void AS $$
BEGIN
    -- Delete resolved errors older than 30 days
    DELETE FROM error_logs
    WHERE resolved = true
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- Delete unresolved errors older than 90 days
    DELETE FROM error_logs
    WHERE resolved = false
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
