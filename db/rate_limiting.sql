-- Rate limiting and usage quotas schema

-- Subscription tiers table
CREATE TABLE subscription_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    api_rate_limit INTEGER NOT NULL, -- Requests per minute
    daily_message_limit INTEGER NOT NULL,
    monthly_message_limit INTEGER NOT NULL,
    file_upload_limit INTEGER NOT NULL, -- MB per month
    file_size_limit INTEGER NOT NULL, -- MB per file
    max_chatbots INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default subscription tiers
INSERT INTO subscription_tiers (name, api_rate_limit, daily_message_limit, monthly_message_limit, file_upload_limit, file_size_limit, max_chatbots, price) 
VALUES 
('free', 60, 100, 1000, 100, 5, 1, 0),
('pro', 300, 1000, 10000, 1000, 25, 5, 49.99),
('business', 1000, 5000, 100000, 5000, 100, 20, 199.99);

-- User usage tracking table
CREATE TABLE user_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    api_calls_count INTEGER DEFAULT 0,
    api_calls_last_reset TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    daily_messages_count INTEGER DEFAULT 0,
    daily_messages_last_reset TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    monthly_messages_count INTEGER DEFAULT 0,
    monthly_messages_last_reset TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    file_upload_total BIGINT DEFAULT 0, -- In bytes
    file_upload_last_reset TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Usage notifications table
CREATE TABLE usage_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    type TEXT NOT NULL, -- 'api_limit', 'message_limit', 'storage_limit', 'upgrade_prompt'
    message TEXT NOT NULL,
    seen BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Function to check and update API rate limits
CREATE OR REPLACE FUNCTION check_api_rate_limit(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_tier TEXT;
    rate_limit INTEGER;
    current_count INTEGER;
BEGIN
    -- Get user's subscription tier
    SELECT subscription INTO user_tier
    FROM profiles
    WHERE id = user_id_param;

    -- Get rate limit for user's tier
    SELECT api_rate_limit INTO rate_limit
    FROM subscription_tiers
    WHERE name = user_tier;

    -- Get current API calls count
    SELECT api_calls_count INTO current_count
    FROM user_usage
    WHERE user_id = user_id_param;

    -- Check if within limit
    RETURN current_count < rate_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily counters
CREATE OR REPLACE FUNCTION reset_daily_counters()
RETURNS void AS $$
BEGIN
    UPDATE user_usage
    SET daily_messages_count = 0,
        daily_messages_last_reset = NOW()
    WHERE DATE(daily_messages_last_reset) < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly counters
CREATE OR REPLACE FUNCTION reset_monthly_counters()
RETURNS void AS $$
BEGIN
    UPDATE user_usage
    SET monthly_messages_count = 0,
        monthly_messages_last_reset = NOW(),
        file_upload_total = 0,
        file_upload_last_reset = NOW()
    WHERE DATE_TRUNC('month', monthly_messages_last_reset) < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has exceeded limits and create notification
CREATE OR REPLACE FUNCTION check_and_notify_limits()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    tier_limit RECORD;
BEGIN
    FOR user_record IN 
        SELECT u.*, p.subscription
        FROM user_usage u
        JOIN profiles p ON u.user_id = p.id
    LOOP
        -- Get tier limits
        SELECT * INTO tier_limit
        FROM subscription_tiers
        WHERE name = user_record.subscription;

        -- Check monthly message limit (80% threshold)
        IF user_record.monthly_messages_count > (tier_limit.monthly_message_limit * 0.8) THEN
            INSERT INTO usage_notifications (user_id, type, message)
            VALUES (
                user_record.user_id,
                'message_limit',
                'You have used ' || 
                ROUND((user_record.monthly_messages_count::float / tier_limit.monthly_message_limit * 100))::text || 
                '% of your monthly message limit'
            )
            ON CONFLICT DO NOTHING;
        END IF;

        -- Check storage limit (80% threshold)
        IF user_record.file_upload_total > (tier_limit.file_upload_limit * 1024 * 1024 * 0.8) THEN
            INSERT INTO usage_notifications (user_id, type, message)
            VALUES (
                user_record.user_id,
                'storage_limit',
                'You have used ' || 
                ROUND((user_record.file_upload_total::float / (tier_limit.file_upload_limit * 1024 * 1024) * 100))::text || 
                '% of your storage limit'
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
