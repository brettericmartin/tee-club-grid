# Analytics Dashboard SQL Queries

## Table of Contents
1. [Funnel Conversion Metrics](#funnel-conversion-metrics)
2. [Referral Program Analytics](#referral-program-analytics)
3. [User Activation & Retention](#user-activation--retention)
4. [Cohort Analysis](#cohort-analysis)
5. [Real-Time Dashboards](#real-time-dashboards)

## Prerequisites

### Create Analytics Events Table
```sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  event_category VARCHAR(100),
  properties JSONB,
  session_id VARCHAR(255),
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);
```

## Funnel Conversion Metrics

### Overall Conversion Funnel
```sql
WITH funnel_stages AS (
  SELECT
    COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'waitlist_viewed') as visitors,
    COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'waitlist_form_started') as started,
    COUNT(DISTINCT properties->>'email') FILTER (WHERE event_name = 'waitlist_submitted') as submitted,
    COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'beta_approved') as approved,
    COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'beta_first_login') as activated,
    COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'bag_created_first_time') as engaged
  FROM analytics_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
  visitors,
  started,
  submitted,
  approved,
  activated,
  engaged,
  ROUND(100.0 * started / NULLIF(visitors, 0), 2) as view_to_start_rate,
  ROUND(100.0 * submitted / NULLIF(started, 0), 2) as start_to_submit_rate,
  ROUND(100.0 * approved / NULLIF(submitted, 0), 2) as submit_to_approve_rate,
  ROUND(100.0 * activated / NULLIF(approved, 0), 2) as approve_to_activate_rate,
  ROUND(100.0 * engaged / NULLIF(activated, 0), 2) as activate_to_engage_rate,
  ROUND(100.0 * engaged / NULLIF(visitors, 0), 2) as overall_conversion
FROM funnel_stages;
```

### Daily Funnel Metrics
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'waitlist_viewed') as views,
  COUNT(DISTINCT properties->>'email') FILTER (WHERE event_name = 'waitlist_submitted') as submissions,
  COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'beta_approved') as approvals,
  ROUND(
    100.0 * COUNT(DISTINCT properties->>'email') FILTER (WHERE event_name = 'waitlist_submitted') / 
    NULLIF(COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'waitlist_viewed'), 0), 
    2
  ) as conversion_rate
FROM analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Waitlist Score Distribution
```sql
SELECT 
  CASE 
    WHEN CAST(properties->>'score' AS INT) >= 8 THEN 'High (8-10)'
    WHEN CAST(properties->>'score' AS INT) >= 5 THEN 'Medium (5-7)'
    ELSE 'Low (0-4)'
  END as score_bracket,
  COUNT(*) as count,
  ROUND(AVG(CAST(properties->>'score' AS INT)), 2) as avg_score,
  COUNT(*) FILTER (WHERE event_name = 'beta_approved') as approved_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_name = 'beta_approved') / COUNT(*),
    2
  ) as approval_rate
FROM analytics_events
WHERE event_name IN ('waitlist_submitted', 'beta_approved')
  AND properties->>'score' IS NOT NULL
GROUP BY score_bracket
ORDER BY MIN(CAST(properties->>'score' AS INT)) DESC;
```

## Referral Program Analytics

### Referral Performance Overview
```sql
WITH referral_metrics AS (
  SELECT
    COUNT(DISTINCT properties->>'referral_code') as total_codes_generated,
    COUNT(*) FILTER (WHERE event_name = 'referral_link_copied') as total_copies,
    COUNT(*) FILTER (WHERE event_name = 'referral_link_shared') as total_shares,
    COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'referral_visit') as total_visits,
    COUNT(DISTINCT properties->>'signup_email') FILTER (WHERE event_name = 'referral_signup') as total_signups
  FROM analytics_events
  WHERE event_category = 'referral'
)
SELECT 
  *,
  ROUND(100.0 * total_signups / NULLIF(total_visits, 0), 2) as visit_to_signup_rate,
  ROUND(1.0 * total_signups / NULLIF(total_codes_generated, 0), 2) as avg_signups_per_code
FROM referral_metrics;
```

### Top Referrers Leaderboard
```sql
SELECT 
  p.username,
  p.display_name,
  COUNT(DISTINCT ae.properties->>'signup_email') as referral_count,
  COUNT(DISTINCT DATE(ae.created_at)) as active_days,
  MIN(ae.created_at) as first_referral,
  MAX(ae.created_at) as last_referral,
  ROUND(
    COUNT(DISTINCT ae.properties->>'signup_email')::NUMERIC / 
    NULLIF(DATE_PART('day', MAX(ae.created_at) - MIN(ae.created_at)) + 1, 0),
    2
  ) as avg_referrals_per_day
FROM analytics_events ae
JOIN profiles p ON p.id = CAST(ae.properties->>'referrer_id' AS UUID)
WHERE ae.event_name = 'referral_signup'
GROUP BY p.username, p.display_name
ORDER BY referral_count DESC
LIMIT 20;
```

### Viral Coefficient Calculation
```sql
WITH user_referrals AS (
  SELECT 
    properties->>'referrer_id' as referrer_id,
    COUNT(DISTINCT properties->>'signup_email') as direct_referrals
  FROM analytics_events
  WHERE event_name = 'referral_signup'
    AND properties->>'referral_level' = '1'
  GROUP BY properties->>'referrer_id'
),
viral_metrics AS (
  SELECT 
    AVG(direct_referrals) as avg_referrals_per_user,
    COUNT(DISTINCT referrer_id) as total_referrers
  FROM user_referrals
)
SELECT 
  total_referrers,
  ROUND(avg_referrals_per_user, 2) as viral_coefficient,
  CASE 
    WHEN avg_referrals_per_user > 1 THEN 'VIRAL 🚀'
    WHEN avg_referrals_per_user > 0.5 THEN 'GROWING 📈'
    ELSE 'SUB-VIRAL ⚠️'
  END as growth_status
FROM viral_metrics;
```

### Referral Channel Performance
```sql
SELECT 
  properties->>'share_channel' as channel,
  COUNT(*) as share_count,
  COUNT(DISTINCT properties->>'referral_code') as unique_codes,
  COUNT(DISTINCT v.session_id) as visits_generated,
  COUNT(DISTINCT s.properties->>'signup_email') as signups_generated,
  ROUND(
    100.0 * COUNT(DISTINCT s.properties->>'signup_email') / 
    NULLIF(COUNT(DISTINCT v.session_id), 0),
    2
  ) as conversion_rate
FROM analytics_events shares
LEFT JOIN analytics_events v ON v.event_name = 'referral_visit' 
  AND v.properties->>'referral_code' = shares.properties->>'referral_code'
LEFT JOIN analytics_events s ON s.event_name = 'referral_signup'
  AND s.properties->>'referral_code' = shares.properties->>'referral_code'
WHERE shares.event_name = 'referral_link_shared'
GROUP BY properties->>'share_channel'
ORDER BY signups_generated DESC;
```

## User Activation & Retention

### Activation Funnel (First 7 Days)
```sql
WITH user_cohort AS (
  SELECT DISTINCT
    user_id,
    MIN(created_at) as approval_date
  FROM analytics_events
  WHERE event_name = 'beta_approved'
  GROUP BY user_id
)
SELECT 
  COUNT(DISTINCT uc.user_id) as approved_users,
  COUNT(DISTINCT l.user_id) as logged_in,
  COUNT(DISTINCT b.user_id) as created_bag,
  COUNT(DISTINCT e.user_id) as added_equipment,
  COUNT(DISTINCT p.user_id) as published_post,
  ROUND(100.0 * COUNT(DISTINCT l.user_id) / COUNT(DISTINCT uc.user_id), 2) as login_rate,
  ROUND(100.0 * COUNT(DISTINCT b.user_id) / COUNT(DISTINCT uc.user_id), 2) as bag_creation_rate,
  ROUND(100.0 * COUNT(DISTINCT e.user_id) / COUNT(DISTINCT uc.user_id), 2) as equipment_add_rate,
  ROUND(100.0 * COUNT(DISTINCT p.user_id) / COUNT(DISTINCT uc.user_id), 2) as post_publish_rate
FROM user_cohort uc
LEFT JOIN analytics_events l ON l.user_id = uc.user_id 
  AND l.event_name = 'beta_first_login'
  AND l.created_at <= uc.approval_date + INTERVAL '7 days'
LEFT JOIN analytics_events b ON b.user_id = uc.user_id
  AND b.event_name = 'bag_created_first_time'
  AND b.created_at <= uc.approval_date + INTERVAL '7 days'
LEFT JOIN analytics_events e ON e.user_id = uc.user_id
  AND e.event_name = 'equipment_added_first'
  AND e.created_at <= uc.approval_date + INTERVAL '7 days'
LEFT JOIN analytics_events p ON p.user_id = uc.user_id
  AND p.event_name = 'first_post_published'
  AND p.created_at <= uc.approval_date + INTERVAL '7 days'
WHERE uc.approval_date >= CURRENT_DATE - INTERVAL '30 days';
```

### Daily Active Users (DAU)
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as daily_active_users,
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(*) as total_events,
  ROUND(COUNT(*)::NUMERIC / COUNT(DISTINCT user_id), 2) as events_per_user
FROM analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND user_id IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### User Engagement Segments
```sql
WITH user_activity AS (
  SELECT 
    user_id,
    COUNT(DISTINCT DATE(created_at)) as active_days,
    COUNT(*) as total_events,
    COUNT(DISTINCT event_name) as unique_events,
    MAX(created_at) as last_active
  FROM analytics_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND user_id IS NOT NULL
  GROUP BY user_id
)
SELECT 
  CASE 
    WHEN active_days >= 20 THEN 'Power Users'
    WHEN active_days >= 10 THEN 'Regular Users'
    WHEN active_days >= 3 THEN 'Casual Users'
    WHEN last_active >= CURRENT_DATE - INTERVAL '7 days' THEN 'New/Returning'
    ELSE 'Inactive'
  END as user_segment,
  COUNT(*) as user_count,
  ROUND(AVG(active_days), 1) as avg_active_days,
  ROUND(AVG(total_events), 1) as avg_events,
  ROUND(AVG(unique_events), 1) as avg_unique_events
FROM user_activity
GROUP BY user_segment
ORDER BY MIN(active_days) DESC;
```

## Cohort Analysis

### Weekly Retention Cohorts
```sql
WITH cohorts AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', MIN(created_at)) as cohort_week
  FROM analytics_events
  WHERE event_name = 'beta_approved'
  GROUP BY user_id
),
retention AS (
  SELECT 
    c.cohort_week,
    DATE_TRUNC('week', ae.created_at) as activity_week,
    COUNT(DISTINCT c.user_id) as users
  FROM cohorts c
  LEFT JOIN analytics_events ae ON ae.user_id = c.user_id
  WHERE ae.created_at >= c.cohort_week
  GROUP BY c.cohort_week, DATE_TRUNC('week', ae.created_at)
)
SELECT 
  cohort_week,
  SUM(CASE WHEN activity_week = cohort_week THEN users END) as week_0,
  SUM(CASE WHEN activity_week = cohort_week + INTERVAL '1 week' THEN users END) as week_1,
  SUM(CASE WHEN activity_week = cohort_week + INTERVAL '2 weeks' THEN users END) as week_2,
  SUM(CASE WHEN activity_week = cohort_week + INTERVAL '3 weeks' THEN users END) as week_3,
  SUM(CASE WHEN activity_week = cohort_week + INTERVAL '4 weeks' THEN users END) as week_4,
  ROUND(100.0 * SUM(CASE WHEN activity_week = cohort_week + INTERVAL '1 week' THEN users END) / 
    NULLIF(SUM(CASE WHEN activity_week = cohort_week THEN users END), 0), 2) as week_1_retention,
  ROUND(100.0 * SUM(CASE WHEN activity_week = cohort_week + INTERVAL '4 weeks' THEN users END) / 
    NULLIF(SUM(CASE WHEN activity_week = cohort_week THEN users END), 0), 2) as week_4_retention
FROM retention
GROUP BY cohort_week
ORDER BY cohort_week DESC;
```

### Referral Source Cohort Performance
```sql
WITH user_source AS (
  SELECT 
    user_id,
    CASE 
      WHEN properties->>'referral_code' IS NOT NULL THEN 'Referred'
      WHEN properties->>'utm_source' IS NOT NULL THEN properties->>'utm_source'
      ELSE 'Organic'
    END as acquisition_source,
    MIN(created_at) as signup_date
  FROM analytics_events
  WHERE event_name = 'waitlist_submitted'
  GROUP BY user_id, acquisition_source
)
SELECT 
  acquisition_source,
  COUNT(DISTINCT us.user_id) as total_users,
  COUNT(DISTINCT a.user_id) as approved_users,
  COUNT(DISTINCT l.user_id) as activated_users,
  COUNT(DISTINCT b.user_id) as engaged_users,
  ROUND(100.0 * COUNT(DISTINCT a.user_id) / COUNT(DISTINCT us.user_id), 2) as approval_rate,
  ROUND(100.0 * COUNT(DISTINCT l.user_id) / COUNT(DISTINCT a.user_id), 2) as activation_rate,
  ROUND(100.0 * COUNT(DISTINCT b.user_id) / COUNT(DISTINCT l.user_id), 2) as engagement_rate
FROM user_source us
LEFT JOIN analytics_events a ON a.user_id = us.user_id AND a.event_name = 'beta_approved'
LEFT JOIN analytics_events l ON l.user_id = us.user_id AND l.event_name = 'beta_first_login'
LEFT JOIN analytics_events b ON b.user_id = us.user_id AND b.event_name = 'bag_created_first_time'
GROUP BY acquisition_source
ORDER BY total_users DESC;
```

## Real-Time Dashboards

### Live Activity Feed
```sql
SELECT 
  created_at,
  event_name,
  event_category,
  properties->>'email' as email,
  properties->>'referral_code' as referral_code,
  properties->>'score' as score,
  session_id
FROM analytics_events
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 100;
```

### Current Day Performance
```sql
WITH today_metrics AS (
  SELECT 
    COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'waitlist_viewed') as views_today,
    COUNT(*) FILTER (WHERE event_name = 'waitlist_submitted') as submissions_today,
    COUNT(*) FILTER (WHERE event_name = 'referral_signup') as referrals_today,
    COUNT(*) FILTER (WHERE event_name = 'beta_approved') as approvals_today,
    COUNT(DISTINCT user_id) as active_users_today
  FROM analytics_events
  WHERE DATE(created_at) = CURRENT_DATE
),
yesterday_metrics AS (
  SELECT 
    COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'waitlist_viewed') as views_yesterday,
    COUNT(*) FILTER (WHERE event_name = 'waitlist_submitted') as submissions_yesterday
  FROM analytics_events
  WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
)
SELECT 
  t.*,
  y.views_yesterday,
  y.submissions_yesterday,
  ROUND(100.0 * (t.views_today - y.views_yesterday) / NULLIF(y.views_yesterday, 0), 2) as views_change_pct,
  ROUND(100.0 * (t.submissions_today - y.submissions_yesterday) / NULLIF(y.submissions_yesterday, 0), 2) as submissions_change_pct
FROM today_metrics t, yesterday_metrics y;
```

### Hourly Traffic Pattern
```sql
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(DISTINCT session_id) as sessions,
  COUNT(*) as events,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE event_name = 'waitlist_submitted') as submissions
FROM analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;
```

## Dashboard Implementation Notes

### Grafana Setup
1. Connect PostgreSQL data source
2. Import dashboard JSON templates
3. Set refresh intervals (5min for real-time, 1hr for historical)
4. Configure alerts for key metrics

### Metabase Configuration
1. Add PostgreSQL database connection
2. Create dashboard collections for each category
3. Set up email reports for weekly metrics
4. Enable caching for expensive queries

### Custom Dashboard API
```typescript
// Example endpoint for dashboard metrics
app.get('/api/analytics/dashboard', async (req, res) => {
  const metrics = await Promise.all([
    getFunnelMetrics(),
    getReferralMetrics(),
    getActivationMetrics(),
    getRealTimeMetrics()
  ]);
  
  res.json({
    funnel: metrics[0],
    referral: metrics[1],
    activation: metrics[2],
    realtime: metrics[3],
    generated_at: new Date().toISOString()
  });
});
```

## Performance Optimization

### Materialized Views for Heavy Queries
```sql
CREATE MATERIALIZED VIEW daily_funnel_metrics AS
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'waitlist_viewed') as views,
  COUNT(DISTINCT properties->>'email') FILTER (WHERE event_name = 'waitlist_submitted') as submissions,
  COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'beta_approved') as approvals
FROM analytics_events
GROUP BY DATE(created_at);

CREATE INDEX idx_daily_funnel_date ON daily_funnel_metrics(date);

-- Refresh daily via cron
REFRESH MATERIALIZED VIEW daily_funnel_metrics;
```

### Partitioning for Scale
```sql
-- Partition analytics_events by month
CREATE TABLE analytics_events_2024_01 PARTITION OF analytics_events
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE analytics_events_2024_02 PARTITION OF analytics_events
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```