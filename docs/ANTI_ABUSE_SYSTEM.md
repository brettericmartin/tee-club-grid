# Anti-Abuse System Documentation

## Overview

This document describes the multi-layered anti-abuse system implemented for the waitlist submission endpoint. The system uses three primary defense mechanisms:

1. **Rate Limiting** - Leaky bucket algorithm with configurable burst and sustained rates
2. **Honeypot Fields** - Hidden form fields to catch automated bots
3. **CAPTCHA** - Cloudflare Turnstile for human verification (optional, behind feature flag)

## Components

### 1. Rate Limiting

**Implementation**: Leaky bucket algorithm stored in Supabase

**Configuration**:
- Burst capacity: 30 requests
- Sustained rate: 10 requests per minute
- Per-IP tracking with IPv6 support
- Automatic cleanup of stale entries after 1 hour

**Files**:
- `/src/services/rateLimiter.ts` - Core rate limiting logic
- `/api/middleware/rateLimit.ts` - Middleware for Vercel functions
- `/scripts/create-rate-limit-tables.sql` - Database schema

**Headers**:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 2024-01-01T12:00:00Z
Retry-After: 60 (on 429 responses)
```

### 2. Honeypot Field

**Implementation**: Hidden `contact_phone` field in form

**Behavior**:
- If filled: Submission is silently accepted but forced to `status='pending'`
- No indication to the user that honeypot was triggered
- Logged as `honeypot_triggered` in abuse_metrics table

**Files**:
- `/src/components/security/HoneypotField.tsx` - React component
- Updated in `/src/components/waitlist/WaitlistForm.tsx`

**CSS Hiding**:
```css
position: absolute;
left: -9999px;
aria-hidden: true;
tabindex: -1;
```

### 3. CAPTCHA (Cloudflare Turnstile)

**Implementation**: Privacy-focused alternative to reCAPTCHA

**Features**:
- Invisible by default (`interaction-only` mode)
- Auto-enables when abuse threshold reached (50 honeypot hits/hour)
- Feature flag controlled
- Graceful fallback if disabled

**Files**:
- `/src/components/security/TurnstileWrapper.tsx` - React wrapper
- Server verification in submit endpoint

**Configuration**:
```env
TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
VITE_CAPTCHA_ENABLED=false
```

## Database Schema

### rate_limit_buckets
```sql
identifier TEXT PRIMARY KEY      -- IP address
endpoint TEXT                    -- API endpoint
tokens DECIMAL(10,2)            -- Current tokens
last_refill TIMESTAMPTZ         -- Last refill time
request_count INTEGER           -- Total requests
last_request_at TIMESTAMPTZ     -- Last request
```

### abuse_metrics
```sql
id UUID PRIMARY KEY
metric_type TEXT                -- 'rate_limit_exceeded', 'honeypot_triggered'
identifier TEXT                 -- IP address
endpoint TEXT                   -- API endpoint
metadata JSONB                  -- Additional context
created_at TIMESTAMPTZ
```

### feature_flags additions
```sql
captcha_enabled BOOLEAN DEFAULT false
captcha_auto_threshold INTEGER DEFAULT 50
rate_limit_enabled BOOLEAN DEFAULT true
rate_limit_burst INTEGER DEFAULT 30
rate_limit_per_minute INTEGER DEFAULT 10
```

## Setup Instructions

### 1. Run Database Migration

```bash
# Check migration status
node scripts/apply-rate-limit-migration.js

# Apply migration in Supabase SQL editor
# Copy contents of scripts/create-rate-limit-tables.sql
```

### 2. Configure Environment Variables

```env
# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_BURST=30
RATE_LIMIT_PER_MINUTE=10

# CAPTCHA (optional)
VITE_TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
VITE_CAPTCHA_ENABLED=false

# Auto-enable threshold
CAPTCHA_AUTO_ENABLE_THRESHOLD=50
```

### 3. Get Turnstile Keys (Optional)

1. Visit https://dash.cloudflare.com/sign-up/turnstile
2. Create a new site
3. Choose "Invisible" widget type
4. Add your domains (localhost for testing)
5. Copy site key and secret key

## Testing

### Run Test Suite

```bash
# Test rate limiting and honeypot
node scripts/test-rate-limiting.js
```

### Manual Testing

1. **Rate Limiting**: Submit 31 requests rapidly, 31st should fail with 429
2. **Honeypot**: Fill the phone field, submission should always be pending
3. **CAPTCHA**: Enable via feature flag, should appear on form

## Monitoring

### Metrics to Track

```sql
-- Honeypot triggers in last hour
SELECT COUNT(*) 
FROM abuse_metrics 
WHERE metric_type = 'honeypot_triggered' 
  AND created_at > NOW() - INTERVAL '1 hour';

-- Rate limit hits in last hour
SELECT COUNT(*) 
FROM abuse_metrics 
WHERE metric_type = 'rate_limit_exceeded' 
  AND created_at > NOW() - INTERVAL '1 hour';

-- Top abusive IPs
SELECT identifier, COUNT(*) as abuse_count
FROM abuse_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY identifier
ORDER BY abuse_count DESC
LIMIT 10;
```

### Auto-Response Logic

The system automatically enables CAPTCHA when:
- More than 50 honeypot triggers in 1 hour
- More than 100 rate limit hits in 1 hour

Check status:
```sql
SELECT should_enable_captcha();
```

## API Response Examples

### Rate Limited
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```
Status: 429

### Honeypot Triggered (Silent)
```json
{
  "status": "pending",
  "score": 85,
  "spotsRemaining": 50,
  "message": "Thank you for your interest! You've been added to the waitlist."
}
```
Status: 200 (appears normal to bot)

### CAPTCHA Failed
```json
{
  "error": "Verification failed",
  "message": "Please complete the security check"
}
```
Status: 400

## Troubleshooting

### Rate Limiting Not Working

1. Check environment variable: `RATE_LIMIT_ENABLED=true`
2. Verify database tables exist
3. Check Supabase service key is set
4. Verify IP extraction is working (check headers)

### Honeypot Always Triggering

1. Ensure field name is `contact_phone`
2. Check CSS is hiding the field properly
3. Verify browser autofill is disabled
4. Check form isn't pre-filling the field

### CAPTCHA Not Appearing

1. Check feature flag in database
2. Verify Turnstile keys are set
3. Check browser console for errors
4. Ensure script is loading from Cloudflare

## Security Considerations

1. **IP Spoofing**: We check multiple headers but trust proxies
2. **Distributed Attacks**: Rate limiting is per-IP, not global
3. **Privacy**: We hash IPs in logs after 24 hours
4. **Graceful Degradation**: System allows requests on errors

## Performance Impact

- Rate limit check: ~20ms (Supabase query)
- Honeypot: 0ms (client-side only)
- CAPTCHA: ~200ms when enabled (external script)
- Total overhead: <50ms for typical request

## Future Improvements

1. **Global Rate Limiting**: Add account-wide limits
2. **Reputation System**: Track IP reputation over time
3. **Machine Learning**: Detect patterns in abuse
4. **Geographic Blocking**: Block specific regions if needed
5. **WebAuthn**: Add passwordless authentication option