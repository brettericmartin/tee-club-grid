# Affiliate Links & Video Features Implementation Guide

## ✅ Completed Components

### 1. Database Schema (`scripts/add-affiliate-video-features.sql`)
- ✅ `user_equipment_links` table - User-owned affiliate links for bag items
- ✅ `equipment_videos` table - Equipment-level videos (UGC)
- ✅ `user_bag_videos` table - Bag-level recommended videos
- ✅ `link_clicks` table - Analytics tracking
- ✅ RLS policies for all tables
- ✅ Helper functions for video ID extraction

### 2. TypeScript Types (`src/types/affiliateVideos.ts`)
- ✅ Complete type definitions for all features
- ✅ Form data types
- ✅ Extended types with stats

### 3. Video Utilities (`src/utils/videoUtils.ts`)
- ✅ Video URL parsing for YouTube, TikTok, Vimeo
- ✅ Video ID extraction
- ✅ Embed URL generation
- ✅ Thumbnail URL generation
- ✅ Duration formatting

### 4. Core Components
- ✅ `VideoEmbed` component with lazy loading
- ✅ `UserEquipmentLinkManager` component
- ✅ User equipment links service
- ✅ Equipment videos service

## 🚧 Remaining Implementation

### 5. Equipment Video Display Components

#### `EquipmentVideoGallery.tsx`
```tsx
// Display videos on equipment detail pages
// Grid layout with thumbnails
// Click to play in modal
// View count tracking
```

#### `EquipmentVideoModal.tsx`
```tsx
// Full-screen video player
// Video details and contributor info
// Related videos sidebar
```

### 6. Bag Videos Service (`src/services/bagVideos.ts`)
```typescript
// CRUD operations for bag videos
// Feed sharing functionality
// Video ordering
```

### 7. Bag Video Components

#### `BagVideoManager.tsx`
```tsx
// Add/remove videos from bag
// Drag-and-drop reordering
// Feed sharing toggle
```

#### `BagVideoShelf.tsx`
```tsx
// Display videos on bag page
// Horizontal scrolling gallery
// Embed or link options
```

### 8. Integration Points

#### Update `BagCompositeCard.tsx`
```tsx
// Add affiliate link badges
// Show primary link as CTA button
// Video count indicator
```

#### Update `EquipmentDetailModal.tsx`
```tsx
// Add video section
// Add user links section
// Integrate with existing price comparison
```

#### Update `MyBagSupabase.tsx`
```tsx
// Add link management buttons
// Add video management section
// Show analytics for owned links
```

## 📝 Migration Instructions

1. **Run Database Migration**
   ```bash
   # Option 1: Using the migration script
   VITE_SUPABASE_URL=your_url SUPABASE_SERVICE_KEY=your_key node scripts/run-affiliate-video-migration.js
   
   # Option 2: Direct SQL in Supabase Dashboard
   # Copy contents of scripts/add-affiliate-video-features.sql
   # Run in SQL Editor
   ```

2. **Generate TypeScript Types**
   ```bash
   npm run types:generate
   ```

3. **Test Features**
   - Add affiliate links to bag items
   - Add videos to equipment pages
   - Add videos to bag showcase
   - Track link clicks

## 🎯 Usage Examples

### Adding User Equipment Links
```typescript
import { createEquipmentLink } from '@/services/userEquipmentLinks';

const link = await createEquipmentLink(userId, bagId, {
  bag_equipment_id: 'xxx',
  label: 'Buy on Amazon',
  url: 'https://amazon.com/...',
  is_primary: true
});
```

### Adding Equipment Videos
```typescript
import { addEquipmentVideo } from '@/services/equipmentVideos';

const video = await addEquipmentVideo({
  equipment_id: 'xxx',
  url: 'https://youtube.com/watch?v=...',
  title: 'Equipment Review'
}, userId);
```

### Embedding Videos
```tsx
import { VideoEmbed } from '@/components/video/VideoEmbed';

<VideoEmbed 
  url="https://youtube.com/watch?v=..."
  title="Golf Equipment Review"
  lazy={true}
  onPlay={() => trackVideoView()}
/>
```

## 🚀 Next Steps

1. **Complete remaining components** (listed above)
2. **Add video upload for TikTok/Vimeo** (API integration needed)
3. **Implement commission tracking** for affiliate links
4. **Add moderation system** for user-submitted videos
5. **Create analytics dashboard** for link performance
6. **Add video likes/comments** system
7. **Implement feed integration** for shared videos

## 💰 Monetization Strategy

### Affiliate Links
- Users add their own affiliate links
- 50/50 revenue split on platform-wide links
- Track conversions and calculate commissions
- Monthly payout system

### Video Content
- Sponsored video opportunities
- Premium video features (HD, no ads)
- Video analytics for creators
- Brand partnership opportunities

## 📊 Analytics Implementation

### Link Analytics
```sql
-- Get link performance
SELECT 
  l.label,
  l.url,
  COUNT(c.id) as clicks,
  COUNT(DISTINCT c.clicked_by_user) as unique_users
FROM user_equipment_links l
LEFT JOIN link_clicks c ON l.id = c.link_id
WHERE l.user_id = $1
GROUP BY l.id;
```

### Video Analytics
```sql
-- Get video performance
SELECT 
  v.title,
  v.view_count,
  e.brand || ' ' || e.model as equipment
FROM equipment_videos v
JOIN equipment e ON v.equipment_id = e.id
WHERE v.added_by_user_id = $1
ORDER BY v.view_count DESC;
```

## 🔒 Security Considerations

1. **URL Validation**: All URLs are validated before storage
2. **XSS Prevention**: Video embeds use iframes with sandboxing
3. **Click Tracking**: IP addresses are hashed for privacy
4. **Rate Limiting**: Implement limits on video/link submissions
5. **Content Moderation**: Admin verification for videos

## 🎨 UI/UX Guidelines

### Mobile-First Design
- Touch-friendly link management
- Swipeable video galleries
- Bottom sheet modals for mobile
- Optimized video loading

### Performance
- Lazy load videos below fold
- Thumbnail preloading
- CDN for video thumbnails
- Debounced search/filter

### Accessibility
- Keyboard navigation for videos
- ARIA labels for controls
- Captions support
- Reduced motion options