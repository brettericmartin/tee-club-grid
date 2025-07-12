# Equipment Photo Upload Troubleshooting Guide

## Common Issues and Solutions

### 1. "Permission denied" Error
**Cause**: Storage bucket policies not configured correctly
**Solution**: 
1. Go to Supabase Dashboard > Storage > Policies
2. Make sure the `equipment-photos` bucket has these policies:
   - INSERT: Authenticated users can upload to their folder
   - SELECT: Anyone can view (public access)
   - UPDATE/DELETE: Users can manage their own files

### 2. "Bucket not found" Error
**Cause**: Storage bucket doesn't exist or wrong name
**Solution**:
1. Check bucket exists: Supabase Dashboard > Storage
2. Bucket should be named `equipment-photos` (with hyphen, not underscore)
3. Bucket must be set to PUBLIC

### 3. "File type not supported" Error
**Cause**: Trying to upload non-image files
**Solution**: Only these file types are allowed:
- JPEG/JPG
- PNG
- WebP
- GIF

### 4. "File too large" Error
**Cause**: File exceeds 10MB limit
**Solution**: Compress or resize image before uploading

### 5. Database insert fails after upload
**Cause**: RLS policies on equipment_photos table
**Solution**: Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable RLS
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view
CREATE POLICY "Anyone can view equipment photos" ON equipment_photos
FOR SELECT USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can add photos" ON equipment_photos
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own
CREATE POLICY "Users can update own photos" ON equipment_photos
FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own
CREATE POLICY "Users can delete own photos" ON equipment_photos
FOR DELETE USING (auth.uid() = user_id);
```

### 6. Missing metadata column
**Cause**: Table structure outdated
**Solution**: Add the column:
```sql
ALTER TABLE equipment_photos 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
```

## Testing Upload Functionality

1. **Check you're logged in**: 
   - Open browser console
   - Check for auth token in localStorage

2. **Test with small image first**:
   - Use a small JPEG under 1MB
   - Check browser console for errors

3. **Verify bucket settings**:
   - Public: Yes
   - File size limit: 10MB
   - Allowed MIME types: image/*

4. **Check network tab**:
   - Look for failed requests to storage API
   - Check response for detailed error messages

## Complete Setup Checklist

- [ ] `equipment-photos` bucket exists
- [ ] Bucket is set to PUBLIC
- [ ] Storage policies are configured
- [ ] equipment_photos table has RLS enabled
- [ ] Table has all required columns including metadata
- [ ] User is authenticated before uploading
- [ ] File validation works (type and size)

## Debug Information to Provide

When reporting issues, include:
1. Browser console errors
2. Network tab screenshots
3. Which equipment page you're on
4. File type and size attempting to upload
5. Whether you're logged in