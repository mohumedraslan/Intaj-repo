-- Enable Row Level Security (RLS) on public tables

-- Enable RLS on usage_stats table
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

-- Enable RLS on two_factor_setup table
ALTER TABLE public.two_factor_setup ENABLE ROW LEVEL SECURITY;

-- Enable RLS on subscription_tiers table
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_usage table
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Enable RLS on usage_notifications table
ALTER TABLE public.usage_notifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_notifications table
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on error_logs table
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on recovery_logs table
ALTER TABLE public.recovery_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on oauth_states table
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each table

-- Policy for usage_stats: Only allow users to see their own usage stats
CREATE POLICY "Users can view their own usage stats" ON public.usage_stats
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for two_factor_setup: Only allow users to manage their own 2FA setup
CREATE POLICY "Users can manage their own 2FA setup" ON public.two_factor_setup
    FOR ALL USING (auth.uid() = user_id);

-- Policy for subscription_tiers: Allow all users to view subscription tiers
CREATE POLICY "All users can view subscription tiers" ON public.subscription_tiers
    FOR SELECT USING (true);

-- Policy for user_usage: Only allow users to see their own usage
CREATE POLICY "Users can view their own usage" ON public.user_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for usage_notifications: Only allow users to see their own notifications
CREATE POLICY "Users can view their own usage notifications" ON public.usage_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for user_notifications: Only allow users to see their own notifications
CREATE POLICY "Users can view their own notifications" ON public.user_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for error_logs: Only allow admins to view error logs
CREATE POLICY "Only admins can view error logs" ON public.error_logs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- Policy for recovery_logs: Only allow admins to view recovery logs
CREATE POLICY "Only admins can view recovery logs" ON public.recovery_logs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- Policy for oauth_states: Only allow users to manage their own OAuth states
CREATE POLICY "Users can manage their own OAuth states" ON public.oauth_states
    FOR ALL USING (auth.uid() = user_id);