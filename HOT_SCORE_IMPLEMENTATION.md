# Hot Score Implementation - Reddit/Instagram Style Algorithm

## Overview
Implemented a Reddit-style hot scoring algorithm for feeds and bags to surface trending content based on recent engagement velocity and time decay.

## Files Created/Modified

### 1. Database Migration
**File:** `/supabase/migrations/20250110_add_hot_scoring.sql`
- Adds hot score columns to `feed_posts` and `user_bags` tables
- Creates PostgreSQL functions for calculating hot scores
- Sets up automatic triggers to update scores when tees are added/removed
- Includes boost_factor for potential sponsored content

### 2. Hot Score Service
**File:** `/src/services/hotScoreService.ts`
- TypeScript service for managing hot scores
- Functions for manual score updates
- Batch processing capabilities
- Equipment boost management for featured items

### 3. Feed Service Updates
**File:** `/src/services/feedService.ts`
- Added `sortBy` parameter to `getFeedPosts` function
- Supports 'hot' sorting option using database hot_score column

### 4. Feed Context Updates
**File:** `/src/contexts/FeedContext.tsx`
- Passes sort parameter through to feed service
- Maintains sort state across the application

### 5. Bags Service Updates
**File:** `/src/services/bags.ts`
- Added 'hot' to sort options
- Orders by hot_score column when hot sorting is selected

### 6. UI Components Updated
**Feed Page:** `/src/pages/Feed.tsx`
- Already had hot sorting UI with Flame icon
- Connected to backend hot scoring system

**Bags Browser:** `/src/pages/BagsBrowser.tsx`
- Added hot sorting option with Flame icon
- Available in both mobile and desktop views
- Shows "Trending now" description

## Algorithm Details

### Hot Score Calculation
```sql
score = (log(tee_velocity + 1) * 10000) / (hours_old + 2)^1.5 * boost_factor
```

Where:
- **tee_velocity** = weighted sum of recent tees:
  - 1 hour tees × 3.0 (most recent, highest weight)
  - 1 day tees × 1.5 (recent, medium weight)
  - 1 week tees × 0.5 (older, lowest weight)
- **hours_old** = time since content creation
- **boost_factor** = multiplier for featured content (default 1.0)

### Key Features
1. **Automatic Updates:** Triggers fire when tees are added/removed
2. **Time Decay:** Older content naturally drops in score
3. **Velocity-Based:** Recent engagement matters more than total
4. **Boost Support:** Can temporarily promote specific equipment/brands
5. **Performance Optimized:** Indexed columns for fast queries

## To Deploy

### Run Migration on Supabase Dashboard
1. Go to Supabase Dashboard > SQL Editor
2. Copy contents of `/supabase/migrations/20250110_add_hot_scoring.sql`
3. Run the migration
4. Verify tables have new columns

### Testing
1. **Feed Page:** Select "Hot" from sort dropdown
2. **Bags Browser:** Select "Hot" from sort dropdown
3. **Create Engagement:** Add tees to posts/bags to see scores update
4. **Verify Ordering:** Recently engaged content should appear higher

## Future Enhancements
- Scheduled job to recalculate scores for older content
- Analytics dashboard for hot score trends
- A/B testing different algorithm weights
- User preference learning for personalized hot scores