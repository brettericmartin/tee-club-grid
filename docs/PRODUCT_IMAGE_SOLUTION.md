# Product Image Solution for Teed.club

## Problem Summary
- Manufacturer CDNs block direct image downloads (403/404 errors)
- Web scraping is blocked by anti-bot measures
- Current images are generic golf photos, not actual product images
- Users expect to see real product photos (TaylorMade Qi10, Titleist Pro V1, etc.)

## Proposed Solution: Community-Driven Photo System

### 1. **Immediate Fix**
- Use high-quality category-appropriate placeholder images
- Clear visual indication that these are placeholders
- Prompt users to upload real photos

### 2. **Community Photo System** (Aligns with CLAUDE.md vision)
```typescript
// User uploads photo of their TaylorMade Qi10
// Photo gets verified by community votes
// Most liked photo becomes the primary image
```

### 3. **Implementation Plan**

#### Phase 1: Placeholder System
- ✅ Update current images with appropriate placeholders
- Add "Upload Photo" button on equipment pages
- Show message: "Be the first to upload a photo of this equipment!"

#### Phase 2: Photo Upload Feature
- Allow authenticated users to upload equipment photos
- Store in Supabase Storage bucket
- Link to equipment via equipment_photos table
- Implement voting/like system

#### Phase 3: Manufacturer Partnerships
- Reach out to brands for official image usage rights
- Implement API integrations where available
- Revenue sharing through affiliate program

### 4. **Benefits of Community System**
- Real photos from actual users
- Multiple angles/conditions shown
- Builds engagement and community
- Avoids legal issues with manufacturer images
- Creates unique content not available elsewhere

### 5. **Technical Implementation**
```javascript
// Example upload flow
async function uploadEquipmentPhoto(equipmentId, file) {
  // 1. Upload to Supabase Storage
  const { data: upload } = await supabase.storage
    .from('equipment-photos')
    .upload(`${equipmentId}/${timestamp}-${file.name}`, file);
    
  // 2. Create database entry
  const { data: photo } = await supabase
    .from('equipment_photos')
    .insert({
      equipment_id: equipmentId,
      photo_url: upload.path,
      uploaded_by: userId,
      likes_count: 0
    });
    
  return photo;
}
```

### 6. **UI/UX Considerations**
- Show placeholder with overlay: "Community photo needed"
- Prominent "Upload Photo" CTA
- Photo gallery view for equipment with multiple uploads
- Voting interface for best photo selection

### 7. **Moderation & Quality Control**
- AI-powered image verification (ensure it's golf equipment)
- Community reporting system
- Minimum quality requirements (resolution, clarity)
- Admin approval for first-time uploaders

This approach turns a limitation into a feature, creating a unique value proposition for Teed.club while staying true to the community-driven vision.