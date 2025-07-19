# Photo Quality Improvements

## Changes Made to Fix Blurry Photos

### 1. Removed Image Compression
- **ImageCropDialog.tsx**:
  - Removed 2048px maximum dimension constraint
  - Images now maintain original resolution when cropped
  - Increased JPEG quality from 0.85 to 0.95 (95%)
  - Watermark is added without resizing the image

### 2. Made Cropping Optional
- **UnifiedPhotoUploadDialog.tsx**:
  - Equipment photos no longer automatically open crop dialog
  - Users can choose to crop using the crop button if desired
  - Original files are uploaded when cropping is skipped
  - Updated file size text from "10MB" to "50MB" to reflect actual limit

### 3. Improved Image Display
- **EquipmentTile.tsx**: Changed from `object-cover` to `object-contain`
- **UnifiedPhotoUploadDialog.tsx**: Preview uses `object-contain`
- **EquipmentImageGallery.tsx**: Already using `object-contain` (good)
- Equipment photos now show full image without cropping

### 4. Added High-Resolution Viewer
- **New Component**: `ImageViewerModal.tsx`
  - Full-screen modal for viewing images at original resolution
  - Click on equipment images to open high-res view
  - ESC or click outside to close
- **EquipmentDetailModal.tsx**: Integrated image viewer
- **EquipmentImageGallery.tsx**: Added click handler with zoom cursor

## Results
- Photos are uploaded at original quality (up to 50MB)
- No automatic downsizing or heavy compression
- Equipment photos display without unwanted cropping
- Users can view full resolution images with the new viewer
- Optional cropping still available for users who want it
- Watermarks are preserved without quality loss

## Notes
- Feed cards still use `object-cover` which is appropriate for maintaining consistent card layouts
- Supabase's 50MB limit is respected
- Images load with `lazy` loading for performance
- High-res viewer uses `eager` loading for immediate display