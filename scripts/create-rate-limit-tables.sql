-- Migration: Create rate limiting tables for anti-abuse protection
-- This implements a leaky bucket algorithm for rate limiting

-- Create the rate limit buckets table
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  identifier TEXT PRIMARY KEY,           -- IP address or other identifier
  endpoint TEXT NOT NULL DEFAULT '',     -- API endpoint being limited
  tokens DECIMAL(10,2) DEFAULT 30,      -- Current tokens in bucket (supports fractional tokens)
  last_refill TIMESTAMPTZ DEFAULT NOW(), -- Last time tokens were refilled
  created_at TIMESTAMPTZ DEFAULT NOW(),  -- When this bucket was created
  request_count INTEGER DEFAULT 0,       -- Total requests from this identifier
  last_request_at TIMESTAMPTZ DEFAULT NOW() -- Last request timestamp
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_endpoint 
  ON rate_limit_buckets(identifier, endpoint);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_last_request 
  ON rate_limit_buckets(last_request_at);

-- Function to clean up old rate limit entries (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limit_buckets 
  WHERE last_request_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Create a table for tracking abuse patterns
CREATE TABLE IF NOT EXISTS abuse_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL, -- 'rate_limit_exceeded', 'honeypot_triggered', 'captcha_failed'
  identifier TEXT,           -- IP or user identifier
  endpoint TEXT,             -- Which endpoint
  metadata JSONB,            -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying recent metrics
CREATE INDEX IF NOT EXISTS idx_abuse_metrics_created 
  ON abuse_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_abuse_metrics_type 
  ON abuse_metrics(metric_type, created_at DESC);

-- Function to check if we should auto-enable CAPTCHA based on abuse metrics
CREATE OR REPLACE FUNCTION should_enable_captcha()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  honeypot_count INTEGER;
  rate_limit_count INTEGER;
BEGIN
  -- Count honeypot triggers in last hour
  SELECT COUNT(*) INTO honeypot_count
  FROM abuse_metrics
  WHERE metric_type = 'honeypot_triggered'
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Count rate limit hits in last hour  
  SELECT COUNT(*) INTO rate_limit_count
  FROM abuse_metrics
  WHERE metric_type = 'rate_limit_exceeded'
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Enable if more than 50 honeypot hits or 100 rate limit hits
  RETURN (honeypot_count > 50 OR rate_limit_count > 100);
END;
$$;

-- Update feature_flags table to include CAPTCHA settings
ALTER TABLE feature_flags 
ADD COLUMN IF NOT EXISTS captcha_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS captcha_auto_threshold INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS rate_limit_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rate_limit_burst INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS rate_limit_per_minute INTEGER DEFAULT 10;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limit_buckets TO authenticated;
GRANT SELECT, INSERT ON abuse_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits TO authenticated;
GRANT EXECUTE ON FUNCTION should_enable_captcha TO authenticated;

-- Add RLS policies
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_metrics ENABLE ROW LEVEL SECURITY;

-- Service role can manage all rate limits
CREATE POLICY "Service role manages rate limits" ON rate_limit_buckets
  FOR ALL USING (true);

-- Service role can insert abuse metrics
CREATE POLICY "Service role logs abuse metrics" ON abuse_metrics
  FOR INSERT WITH CHECK (true);

-- Authenticated users can read their own abuse metrics (for debugging)
CREATE POLICY "Users can view own abuse metrics" ON abuse_metrics
  FOR SELECT USING (
    identifier = (SELECT host(inet(current_setting('request.headers')::json->>'cf-connecting-ip')))
    OR identifier = (SELECT host(inet(current_setting('request.headers')::json->>'x-forwarded-for')))
  );

-- Add comment
COMMENT ON TABLE rate_limit_buckets IS 'Implements leaky bucket rate limiting for API endpoints';
COMMENT ON TABLE abuse_metrics IS 'Tracks abuse patterns for monitoring and auto-response';