# Multi-Equipment Photo Feed Post Implementation Plan
*CLAUDE.md Compliant Version*

## Overview
Implementation plan for creating a feed post type where users can upload multiple photos of different equipment pieces in a single session, with individual equipment tagging for each photo.

## Pre-Development Checklist (Per CLAUDE.md)
- [ ] Run schema check: `node scripts/check-schema.js`
- [ ] Review existing components for reuse
- [ ] Verify table structures match implementation
- [ ] Check for existing utilities
- [ ] Audit existing carousel/gallery components
- [ ] Check for photo queue managers
- [ ] Review current upload components

## User Flow
1. User clicks "Share Equipment Photos" button
2. Modal opens with photo upload interface
3. User adds first photo → selects equipment piece for it
4. Option to "Add Another Photo" appears
5. User can continue adding photos with equipment assignments (max 10)
6. Preview shows all photos with their equipment tags
7. User adds overall caption and publishes as single feed post

## Component Architecture (Performance-Optimized)

### 1. MultiEquipmentPhotoUpload Component

```tsx
// src/components/feed/MultiEquipmentPhotoUpload/index.tsx

import React, { useReducer, useCallback, useMemo, lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// REQUIRED: React.memo for heavy component
const MultiEquipmentPhotoUpload = React.memo(({ onClose, onSuccess }) => {
  // State management with useReducer (avoiding 20+ useState)
  const [state, dispatch] = useReducer(photoQueueReducer, {
    photos: [],
    overallCaption: '',
    isUploading: false,
    uploadProgress: 0,
    errors: []
  });

  // REQUIRED: Stable callbacks
  const handlePhotoAdd = useCallback(async (file: File) => {
    // Compress to < 100KB per CLAUDE.md
    const compressed = await compressImage(file, { 
      maxSize: 100 * 1024,
      format: 'webp',
      fallback: 'jpeg'
    });
    
    dispatch({ 
      type: 'ADD_PHOTO', 
      payload: { 
        file: compressed,
        id: crypto.randomUUID() 
      }
    });
  }, []);

  // REQUIRED: Expensive calculations memoized
  const sortedPhotos = useMemo(() => 
    state.photos.sort((a, b) => a.order - b.order),
    [state.photos]
  );

  const canSubmit = useMemo(() => 
    state.photos.length >= 2 && 
    state.photos.every(p => p.equipmentId) &&
    !state.isUploading,
    [state.photos, state.isUploading]
  );

  // ... rest of component
});

export default MultiEquipmentPhotoUpload;
```

### 2. Photo Queue Reducer

```typescript
// src/components/feed/MultiEquipmentPhotoUpload/photoQueueReducer.ts

interface PhotoUpload {
  id: string;
  file: File;
  previewUrl: string;
  equipmentId: string | null;
  equipmentName: string | null;
  caption: string;
  order: number;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
}

interface State {
  photos: PhotoUpload[];
  overallCaption: string;
  isUploading: boolean;
  uploadProgress: number;
  errors: string[];
}

type Action = 
  | { type: 'ADD_PHOTO'; payload: { file: File; id: string } }
  | { type: 'REMOVE_PHOTO'; payload: string }
  | { type: 'SET_EQUIPMENT'; payload: { photoId: string; equipmentId: string; equipmentName: string } }
  | { type: 'REORDER_PHOTOS'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'SET_CAPTION'; payload: { photoId?: string; caption: string } }
  | { type: 'START_UPLOAD' }
  | { type: 'UPDATE_PROGRESS'; payload: number }
  | { type: 'UPLOAD_SUCCESS' }
  | { type: 'UPLOAD_ERROR'; payload: string };

export function photoQueueReducer(state: State, action: Action): State {
  switch (action.type) {
    // Implement reducer cases
    default:
      return state;
  }
}
```

## Database Schema Changes

### 1. Update feed_posts Type Constraint

```sql
-- Migration: add-multi-equipment-photos.sql

-- Add new type to existing constraint (no data deletion)
ALTER TABLE feed_posts 
DROP CONSTRAINT IF EXISTS feed_posts_type_check;

ALTER TABLE feed_posts 
ADD CONSTRAINT feed_posts_type_check 
CHECK (type IN (
  'new_equipment', 
  'bag_update', 
  'milestone', 
  'playing', 
  'equipment_photo', 
  'multi_equipment_photos'  -- New type
));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_feed_multi_equipment 
ON feed_posts(type, created_at DESC) 
WHERE type = 'multi_equipment_photos';

-- Ensure media_urls array column exists
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
```

### 2. Content JSONB Structure

```json
{
  "photos": [
    {
      "url": "https://storage.../photo1.webp",
      "equipment_id": "uuid-1",
      "equipment_name": "TaylorMade Stealth 2",
      "caption": "Love the carbon face!",
      "order": 0
    },
    {
      "url": "https://storage.../photo2.webp",
      "equipment_id": "uuid-2",
      "equipment_name": "Scotty Cameron Newport",
      "caption": "Best putter ever made",
      "order": 1
    }
  ],
  "overall_caption": "New additions to the bag! 🏌️",
  "equipment_count": 2,
  "photo_count": 2
}
```

## Performance Requirements

### Image Optimization (Per CLAUDE.md)
- **Max sizes:** 100KB per equipment photo
- **Formats:** WebP with JPEG fallback
- **Loading:** `loading="lazy"` on ALL images except first
- **Responsive:** Provide srcset for 1x, 2x displays
- **Compression:** Client-side before upload

```typescript
// src/utils/imageOptimization.ts

export async function compressImage(
  file: File, 
  options: {
    maxSize: number;
    format: 'webp' | 'jpeg';
    fallback?: 'jpeg';
  }
): Promise<File> {
  // Implementation with canvas API
  // Generate srcset versions
  // Return compressed file
}
```

### CSS Performance Guidelines
- **Backgrounds:** Solid only (#1a1a1a for cards, #2a2a2a for elevated)
- **NO glassmorphism** on feed cards or modals
- **GPU Acceleration:** `transform: translateZ(0)` for carousel
- **Will-change:** Only during animation, remove after

```css
/* Carousel animation with GPU acceleration */
.photo-carousel-track {
  transform: translateZ(0);
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.photo-carousel-track.swiping {
  will-change: transform;
}

/* Golf ball bounce for photo added */
@keyframes golf-bounce {
  0%, 100% { transform: scale(1) translateY(0); }
  25% { transform: scale(1.2) translateY(-8px); }
  50% { transform: scale(0.9) translateY(3px); }
  75% { transform: scale(1.1) translateY(-2px); }
}

.photo-added {
  animation: golf-bounce 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### Mobile-First Requirements
- **Touch targets:** Minimum 44x44px
- **Text sizing:** Body 16px minimum
- **Spacing:** 16px minimum padding
- **Gestures:** Swipe, pinch-zoom support

## Component Reuse Audit

### Existing Components to Reuse:
1. ✅ `EquipmentSelectorSimple` - For equipment selection
2. ✅ `ImageCropper` - For photo cropping
3. ✅ `UnifiedPhotoUploadDialog` - Can extend for multi-photo
4. ✅ `FeedItemCard` - Update to support multi-photo display
5. ❓ Check for existing carousel component
6. ❓ Check for drag-and-drop utilities

### New Components Needed:
1. `PhotoCarousel` - Swipeable photo viewer
2. `PhotoQueueManager` - Manage multiple photo uploads
3. `EquipmentTagOverlay` - Show equipment on photos

## Implementation with Code Splitting

```tsx
// Dynamic import for heavy features
const MultiEquipmentUpload = lazy(() => 
  import(
    /* webpackChunkName: "multi-photo" */
    /* webpackPrefetch: true */ 
    './components/feed/MultiEquipmentPhotoUpload'
  )
);

// Usage with Suspense
function FeedPage() {
  const [showMultiUpload, setShowMultiUpload] = useState(false);
  
  return (
    <>
      {showMultiUpload && (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <MultiEquipmentUpload 
            onClose={() => setShowMultiUpload(false)}
            onSuccess={handleSuccess}
          />
        </Suspense>
      )}
    </>
  );
}
```

## Testing Requirements (Per CLAUDE.md)

### Device Testing
1. **iPhone 12 mini** - Worst case iOS performance
2. **Pixel 4a** - Mid-range Android
3. **Desktop** - Chrome, Firefox, Safari

### Network Testing
1. **3G Connection** - Chrome DevTools throttling
2. **Offline mode** - Handle upload failures
3. **Slow upload** - Progress indicators

### Performance Metrics
- **LCP:** < 2.5s
- **FID:** < 100ms  
- **CLS:** < 0.1
- **Bundle increase:** < 50KB for new feature

### Testing Checklist
```bash
# Run before deployment
npm run build
npm run analyze  # Check bundle size

# Performance testing
lighthouse http://localhost:3333/feed --throttling.cpuSlowdownMultiplier=4

# Mobile testing
ngrok http 3333  # Test on real devices
```

## File Structure

```
src/
  components/
    feed/
      MultiEquipmentPhotoUpload/
        index.tsx                    # Main component (React.memo)
        PhotoQueue.tsx               # Queue manager (memoized)
        photoQueueReducer.ts         # State management
        PhotoUploadItem.tsx          # Individual photo item
        EquipmentSelector.tsx        # Reuse existing
        
      PhotoCarousel/
        index.tsx                    # Swipeable gallery
        CarouselDots.tsx            # Navigation dots
        EquipmentOverlay.tsx        # Equipment tags
        
  hooks/
    usePhotoCompression.ts          # Reusable compression
    usePhotoQueue.ts                # Queue management hook
    
  utils/
    imageOptimization.ts            # WebP conversion, srcset
    photoUploadUtils.ts             # Upload helpers
    
  services/
    multiPhotoUpload.ts             # Batch upload service
```

## Service Implementation

```typescript
// src/services/multiPhotoUpload.ts

export async function createMultiEquipmentPost(
  photos: PhotoUpload[],
  overallCaption: string,
  userId: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // 1. Upload photos in parallel (max 3 concurrent)
    const uploadedUrls = await uploadPhotosInBatches(photos, 3);
    
    // 2. Create feed post
    const { data, error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: userId,
        type: 'multi_equipment_photos',
        content: {
          photos: uploadedUrls.map((url, i) => ({
            url,
            equipment_id: photos[i].equipmentId,
            equipment_name: photos[i].equipmentName,
            caption: photos[i].caption,
            order: i
          })),
          overall_caption: overallCaption,
          equipment_count: new Set(photos.map(p => p.equipmentId)).size,
          photo_count: photos.length
        },
        media_urls: uploadedUrls
      })
      .select()
      .single();
      
    if (error) throw error;
    
    // 3. Create equipment_photos entries
    await createEquipmentPhotoEntries(photos, uploadedUrls, userId);
    
    return { success: true, postId: data.id };
  } catch (error) {
    console.error('Multi-photo upload failed:', error);
    return { success: false, error: error.message };
  }
}
```

## Migration Strategy

### Phase 1: Foundation (Week 1)
1. Database migration for new post type
2. Basic multi-photo upload UI
3. Service layer for batch uploads

### Phase 2: Polish (Week 2)
1. Photo carousel with equipment tags
2. Drag-and-drop reordering
3. Error recovery and drafts

### Phase 3: Launch (Week 3)
1. Feature flag rollout (10% → 50% → 100%)
2. Performance monitoring
3. User feedback collection

## Performance Optimizations

### 1. Image Processing
```typescript
// Parallel compression with worker threads
const compressionWorker = new Worker('/workers/imageCompressor.js');

// Queue management for uploads
const uploadQueue = new PQueue({ concurrency: 3 });
```

### 2. Virtual Scrolling
```tsx
// For photo queue > 5 items
import { VirtualList } from '@tanstack/react-virtual';
```

### 3. Optimistic Updates
```typescript
// Show preview immediately
dispatch({ type: 'ADD_PHOTO_OPTIMISTIC', payload: photo });

// Upload in background
uploadQueue.add(() => uploadPhoto(photo));
```

## Error Handling

### Upload Failures
- Retry logic with exponential backoff
- Save draft to localStorage
- Allow resume from draft

### Validation
- Max 10 photos per post
- Min 2 photos for multi-upload
- Equipment selection required
- File size validation before upload

## Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation for photo queue
- Screen reader announcements for actions
- Focus management in modal

## Success Metrics

1. **Adoption:** 30% of photo uploads use multi-feature
2. **Performance:** No increase in FID/LCP
3. **Completion:** 80% completion rate for started uploads
4. **Engagement:** 2x engagement on multi-photo posts

## Context7 MCP Integration

Context7 will provide up-to-date documentation for:
- React 18 Suspense patterns
- Supabase v2 storage APIs  
- Tailwind CSS v3 animations
- TypeScript 5.x satisfies operator

Use by adding "use context7" to prompts when implementing specific features.

---

*This plan complies with all CLAUDE.md standards and is ready for implementation.*