-- Analytics RPC Functions for Intaj Platform
-- This file contains functions to efficiently query analytics data

-- Function to get comprehensive analytics metrics for a user
CREATE OR REPLACE FUNCTION get_analytics_metrics(
  user_id_param UUID,
  time_range_param TEXT DEFAULT '30d'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  days_back INTEGER;
  total_conversations INTEGER;
  active_agents INTEGER;
  avg_response_time NUMERIC;
  conversion_rate NUMERIC;
  agent_performance JSON;
BEGIN
  -- Parse time range parameter
  CASE time_range_param
    WHEN '7d' THEN days_back := 7;
    WHEN '30d' THEN days_back := 30;
    WHEN '90d' THEN days_back := 90;
    ELSE days_back := 30;
  END CASE;

  -- Get total conversations (user messages) in the time range
  SELECT COUNT(*)
  INTO total_conversations
  FROM messages m
  JOIN chatbots c ON m.chatbot_id = c.id
  WHERE c.user_id = user_id_param
    AND m.role = 'user'
    AND m.created_at >= NOW() - INTERVAL '1 day' * days_back;

  -- Get active agents count
  SELECT COUNT(*)
  INTO active_agents
  FROM chatbots c
  WHERE c.user_id = user_id_param;

  -- Simulate average response time (in seconds)
  -- TODO: Calculate real response time based on message timestamps
  avg_response_time := 1.2 + (RANDOM() * 0.8);

  -- Calculate simulated conversion rate
  conversion_rate := CASE 
    WHEN total_conversations > 0 THEN (total_conversations * 0.15)::NUMERIC
    ELSE 0
  END;

  -- Get agent performance data
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'name', agent_data.name,
      'channel', COALESCE(agent_data.platform, 'Website'),
      'conversations', agent_data.conversations,
      'success_rate', (80 + (RANDOM() * 15))::INTEGER,
      'response_time', ROUND((1 + RANDOM() * 2)::NUMERIC, 1) || 's',
      'status', CASE WHEN agent_data.conversations > 0 THEN 'active' ELSE 'inactive' END
    )
  )
  INTO agent_performance
  FROM (
    SELECT 
      c.name,
      COALESCE(conn.platform, 'website') as platform,
      COUNT(m.id) as conversations
    FROM chatbots c
    LEFT JOIN connections conn ON c.id = conn.chatbot_id AND conn.active = true
    LEFT JOIN messages m ON c.id = m.chatbot_id 
      AND m.role = 'user' 
      AND m.created_at >= NOW() - INTERVAL '1 day' * days_back
    WHERE c.user_id = user_id_param
    GROUP BY c.id, c.name, conn.platform
  ) agent_data;

  -- Handle case where no agents exist
  IF agent_performance IS NULL THEN
    agent_performance := '[]'::JSON;
  END IF;

  -- Build final result
  result := JSON_BUILD_OBJECT(
    'total_conversations', total_conversations,
    'active_agents', active_agents,
    'avg_response_time', avg_response_time,
    'conversion_rate', conversion_rate,
    'agent_performance', agent_performance,
    'time_range', time_range_param,
    'generated_at', NOW()
  );

  RETURN result;
END;
$$;

-- Function to get conversation trends over time
CREATE OR REPLACE FUNCTION get_conversation_trends(
  user_id_param UUID,
  time_range_param TEXT DEFAULT '30d'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  days_back INTEGER;
BEGIN
  -- Parse time range parameter
  CASE time_range_param
    WHEN '7d' THEN days_back := 7;
    WHEN '30d' THEN days_back := 30;
    WHEN '90d' THEN days_back := 90;
    ELSE days_back := 30;
  END CASE;

  -- Get daily conversation counts
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'date', trend_data.date,
      'conversations', trend_data.conversations
    ) ORDER BY trend_data.date
  )
  INTO result
  FROM (
    SELECT 
      DATE(m.created_at) as date,
      COUNT(*) as conversations
    FROM messages m
    JOIN chatbots c ON m.chatbot_id = c.id
    WHERE c.user_id = user_id_param
      AND m.role = 'user'
      AND m.created_at >= NOW() - INTERVAL '1 day' * days_back
    GROUP BY DATE(m.created_at)
    ORDER BY DATE(m.created_at)
  ) trend_data;

  -- Handle case where no data exists
  IF result IS NULL THEN
    result := '[]'::JSON;
  END IF;

  RETURN result;
END;
$$;

-- Function to get top performing agents
CREATE OR REPLACE FUNCTION get_top_agents(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 5
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', agent_stats.id,
      'name', agent_stats.name,
      'conversations', agent_stats.conversations,
      'last_active', agent_stats.last_active,
      'platform', COALESCE(agent_stats.platform, 'Website')
    ) ORDER BY agent_stats.conversations DESC
  )
  INTO result
  FROM (
    SELECT 
      c.id,
      c.name,
      COUNT(m.id) as conversations,
      MAX(m.created_at) as last_active,
      COALESCE(conn.platform, 'website') as platform
    FROM chatbots c
    LEFT JOIN messages m ON c.id = m.chatbot_id AND m.role = 'user'
    LEFT JOIN connections conn ON c.id = conn.chatbot_id AND conn.active = true
    WHERE c.user_id = user_id_param
    GROUP BY c.id, c.name, conn.platform
    ORDER BY conversations DESC
    LIMIT limit_param
  ) agent_stats;

  -- Handle case where no agents exist
  IF result IS NULL THEN
    result := '[]'::JSON;
  END IF;

  RETURN result;
END;
$$;

-- Function to get conversations over time for charts
CREATE OR REPLACE FUNCTION get_conversations_over_time(
  user_id_param UUID,
  time_range_param TEXT DEFAULT '30d'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  days_back INTEGER;
BEGIN
  -- Parse time range parameter
  CASE time_range_param
    WHEN '7d' THEN days_back := 7;
    WHEN '30d' THEN days_back := 30;
    WHEN '90d' THEN days_back := 90;
    ELSE days_back := 30;
  END CASE;

  -- Get daily conversation counts with proper date formatting
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'date', TO_CHAR(chart_data.date, 'YYYY-MM-DD'),
      'count', chart_data.count,
      'formatted_date', TO_CHAR(chart_data.date, 'Mon DD')
    ) ORDER BY chart_data.date
  )
  INTO result
  FROM (
    -- Generate date series and left join with actual data
    SELECT 
      date_series.date,
      COALESCE(daily_counts.count, 0) as count
    FROM (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '1 day' * days_back,
        CURRENT_DATE,
        INTERVAL '1 day'
      )::date as date
    ) date_series
    LEFT JOIN (
      SELECT 
        DATE(m.created_at) as date,
        COUNT(*) as count
      FROM messages m
      JOIN chatbots c ON m.chatbot_id = c.id
      WHERE c.user_id = user_id_param
        AND m.role = 'user'
        AND m.created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
      GROUP BY DATE(m.created_at)
    ) daily_counts ON date_series.date = daily_counts.date
    ORDER BY date_series.date
  ) chart_data;

  -- Handle case where no data exists
  IF result IS NULL THEN
    -- Generate empty data for the date range
    SELECT JSON_AGG(
      JSON_BUILD_OBJECT(
        'date', TO_CHAR(date_series.date, 'YYYY-MM-DD'),
        'count', 0,
        'formatted_date', TO_CHAR(date_series.date, 'Mon DD')
      ) ORDER BY date_series.date
    )
    INTO result
    FROM (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '1 day' * days_back,
        CURRENT_DATE,
        INTERVAL '1 day'
      )::date as date
    ) date_series;
  END IF;

  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_analytics_metrics(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_trends(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_agents(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversations_over_time(UUID, TEXT) TO authenticated;
