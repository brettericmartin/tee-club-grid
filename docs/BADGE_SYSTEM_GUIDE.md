# Badge System Implementation Guide

## Overview
The Teed.club badge system rewards users for their engagement and achievements on the platform. Badges are earned by completing specific actions like adding equipment, receiving tees, writing reviews, and more.

## Badge Categories

### 1. Equipment Explorer 🔍
- **Brand Curious** (Bronze) - Try equipment from 3 different brands
- **Brand Enthusiast** (Silver) - Try equipment from 5 different brands  
- **Brand Connoisseur** (Gold) - Try equipment from 10 different brands

### 2. Social Golfer 👥
- **Rising Star** (Bronze) - Receive 10 tees on your bag
- **Crowd Favorite** (Silver) - Receive 50 tees on your bag
- **Tee Legend** (Gold) - Receive 100 tees on your bag

### 3. Gear Collector 🎒
- **Starter Set** (Bronze) - Add 7 items to your bag
- **Full Bag** (Silver) - Add 14 items to your bag
- **Premium Collection** (Gold) - Own equipment worth over $5,000

### 4. Community Contributor 🤝
- **First Review** (Bronze) - Write your first equipment review
- **Helpful Reviewer** (Silver) - Write 5 equipment reviews
- **Review Expert** (Gold) - Write 10 detailed equipment reviews
- **Photo Enthusiast** (Silver) - Upload 10 equipment photos

### 5. Milestone Achievement 🏆
- **Early Adopter** (Platinum) - Join Teed.club in the first year
- **Complete Profile** (Bronze) - Fill out all profile information

## Database Schema

### Tables Created:
1. **badges** - Badge definitions (name, description, icon, category, tier)
2. **badge_criteria** - Criteria for earning each badge
3. **user_badges** - Tracks user progress and earned badges
4. **badge_notifications** - Notifies users of newly earned badges

### Badge Tiers:
- Bronze
- Silver  
- Gold
- Platinum
- Diamond

## Setup Instructions

### Option 1: JavaScript Setup
```bash
node scripts/create-badge-system.js
```

### Option 2: SQL Setup
1. Go to Supabase Dashboard > SQL Editor
2. Copy contents of `supabase/create-badge-system.sql`
3. Execute the SQL

## Implementation Details

### Frontend Components:
- `BadgeDisplay` - Shows individual badge with tier gradient
- `BadgeProgress` - Shows badge with progress bar
- `BadgeShowcase` - Displays user's featured badges on profile
- `BadgeNotificationToast` - Animated notification for new badges
- `BadgesPage` - Full page showing all badges and progress

### Services:
- `badgeService` - API for badge operations
- `useBadgeCheck` - Hook for checking badge progress

### Badge Checking:
Badges are automatically checked when users:
- Add equipment to their bag
- Receive tees on their content
- Write equipment reviews
- Upload photos
- Update their profile

## User Experience

1. **Badge Display**: Users see their earned badges on their profile
2. **Progress Tracking**: In-progress badges show completion percentage
3. **Notifications**: Animated toast when earning new badges
4. **Badge Gallery**: Dedicated page to view all badges (/badges)
5. **Featured Badges**: Users can feature up to 3 badges on their profile

## Future Enhancements

- Seasonal/Limited Edition badges
- Badge sharing on social media
- Badge-based rewards or privileges
- Leaderboards for badge collectors
- Custom badges for tournaments/events