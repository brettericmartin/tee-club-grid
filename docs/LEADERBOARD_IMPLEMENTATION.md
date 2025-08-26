# Referral Leaderboard Implementation

## Overview
Implemented a privacy-aware, cached referral leaderboard system following Daniel Priestley's demand-supply tension model.

## Components Created

### 1. Database Migration
- **File**: `scripts/2025-01-24__leaderboard_feature_flag.sql`
- Adds leaderboard configuration columns to `feature_flags` table
- Creates helper functions for fetching leaderboard data with time periods
- Includes privacy mode settings and caching configuration
- Creates performance indexes for efficient queries

### 2. API Endpoint
- **File**: `api/referrals/leaderboard.ts`
- Returns top N referrers with privacy protection
- Supports time periods: 7 days, 30 days, all-time
- Includes trend tracking (up/down/same/new)
- Returns user's personal rank even if not in top N
- Implements caching with configurable TTL

### 3. Privacy Utilities
- **File**: `src/utils/privacyMasking.ts`
- Masks user information based on privacy mode
- Three modes: `username_first`, `name_only`, `anonymous`
- Handles display names, avatars, and rankings
- Provides formatting utilities for trends and ranks

### 4. Leaderboard Service
- **File**: `src/services/leaderboardService.ts`
- Fetches and caches leaderboard data
- Real-time updates via Supabase subscriptions
- Local storage caching with TTL
- Feature flag checking

### 5. UI Components

#### ReferralLeaderboard Component
- **File**: `src/components/waitlist/ReferralLeaderboard.tsx`
- Three variants: `full`, `compact`, `minimal`
- Period selector (7d/30d/all)
- Trend indicators with colors
- Medal emojis for top 3
- Highlights current user's entry
- Shows user's rank if not in top N

#### LeaderboardSkeleton Component
- **File**: `src/components/waitlist/LeaderboardSkeleton.tsx`
- Loading state with animated placeholders
- Responsive to variant prop

### 6. Page Integrations

#### Waitlist Page
- **Location**: Right sidebar in 3-column layout
- Shows compact leaderboard with top 5
- No period selector (uses default 30d)
- Shows trends

#### Landing Page
- **Location**: New section before final CTA
- Shows minimal leaderboard with top 3
- Clean, focused presentation
- Link to full leaderboard

#### MyInvites Page
- **Location**: Stats grid at top
- Shows user's personal rank card
- Includes trend indicator
- Links to full leaderboard

## Configuration

The leaderboard is controlled via the `feature_flags` table:

```sql
-- Enable/disable the leaderboard
leaderboard_enabled: boolean (default: false)

-- Cache duration in minutes
leaderboard_cache_minutes: int (default: 5)

-- Number of entries to show
leaderboard_size: int (default: 10)

-- Show user avatars
leaderboard_show_avatars: boolean (default: false)

-- Default time period
leaderboard_time_period: '7d' | '30d' | 'all' (default: '30d')

-- Privacy mode
leaderboard_privacy_mode: 'username_first' | 'name_only' | 'anonymous'
```

## Privacy Features

1. **Respects `show_referrer` preference**: Only includes users who have opted in
2. **Privacy modes**:
   - `username_first`: Shows @username, falls back to display name
   - `name_only`: Shows display names only
   - `anonymous`: Shows "User #1", "User #2", etc.
3. **Current user always sees their full info**
4. **Avatars optional**: Controlled by feature flag

## Performance Optimizations

1. **Database indexes** on referral counts and timestamps
2. **Multi-level caching**:
   - API response caching with Cache-Control headers
   - Local storage caching in browser
   - Stale-while-revalidate strategy
3. **Efficient queries** using database functions
4. **Real-time updates** via Supabase subscriptions

## Next Steps

1. **Enable the leaderboard**: Run the migration SQL in Supabase dashboard
2. **Set `leaderboard_enabled = true`** in feature_flags
3. **Monitor performance** and adjust cache settings
4. **Add more gamification**:
   - Achievement badges for top positions
   - Weekly/monthly winners
   - Referral streaks

## Testing

The leaderboard gracefully handles:
- No referral data (shows empty state)
- Feature flag disabled (components don't render)
- Missing columns (uses defaults)
- API errors (shows cached data or error state)

## Migration Status

- ✅ Components and services created
- ✅ Integrated into pages
- ⚠️ Database migration needs manual application via Supabase SQL editor
- ✅ Fallback to defaults if columns don't exist