# Storage Bucket Configuration Guide

After running the SQL script, you need to manually configure storage bucket policies in Supabase Dashboard.

## Step 1: Navigate to Storage Policies

1. Go to your Supabase Dashboard
2. Click on **Storage** in the left sidebar
3. Click on **Policies** tab

## Step 2: Configure equipment-photos Bucket

First, make sure the bucket exists:
- If not, click "New bucket" and create `equipment-photos` as a **PUBLIC** bucket

Then add these policies:

### 2.1 SELECT Policy (Anyone can view)
- Click "New Policy" → "For full customization"
- **Policy Name**: `Anyone can view equipment photos`
- **Allowed operation**: SELECT
- **Target roles**: Leave empty (applies to all)
- **Policy definition**:
  ```sql
  bucket_id = 'equipment-photos'
  ```

### 2.2 INSERT Policy (Authenticated users can upload)
- Click "New Policy" → "For full customization"
- **Policy Name**: `Authenticated users can upload equipment photos`
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **WITH CHECK expression**:
  ```sql
  bucket_id = 'equipment-photos'
  ```

### 2.3 UPDATE Policy (Users can update own photos)
- Click "New Policy" → "For full customization"
- **Policy Name**: `Users can update own equipment photos`
- **Allowed operation**: UPDATE
- **Target roles**: authenticated
- **USING expression**:
  ```sql
  bucket_id = 'equipment-photos' AND auth.uid() = owner
  ```

### 2.4 DELETE Policy (Users can delete own photos)
- Click "New Policy" → "For full customization"
- **Policy Name**: `Users can delete own equipment photos`
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **USING expression**:
  ```sql
  bucket_id = 'equipment-photos' AND auth.uid() = owner
  ```

## Step 3: Configure user-content Bucket

First, make sure the bucket exists:
- If not, click "New bucket" and create `user-content` as a **PUBLIC** bucket

Then add these policies:

### 3.1 SELECT Policy (Anyone can view)
- Click "New Policy" → "For full customization"
- **Policy Name**: `Anyone can view user content`
- **Allowed operation**: SELECT
- **Target roles**: Leave empty (applies to all)
- **Policy definition**:
  ```sql
  bucket_id = 'user-content'
  ```

### 3.2 INSERT Policy (Authenticated users can upload)
- Click "New Policy" → "For full customization"
- **Policy Name**: `Authenticated users can upload user content`
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **WITH CHECK expression**:
  ```sql
  bucket_id = 'user-content'
  ```

### 3.3 UPDATE Policy (Users can update own content)
- Click "New Policy" → "For full customization"
- **Policy Name**: `Users can update own user content`
- **Allowed operation**: UPDATE
- **Target roles**: authenticated
- **USING expression**:
  ```sql
  bucket_id = 'user-content' AND auth.uid() = owner
  ```

### 3.4 DELETE Policy (Users can delete own content)
- Click "New Policy" → "For full customization"
- **Policy Name**: `Users can delete own user content`
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **USING expression**:
  ```sql
  bucket_id = 'user-content' AND auth.uid() = owner
  ```

## Quick Setup Alternative

If your buckets already have RLS enabled but no policies, you can use the "Quick Start" templates:

1. Click on the bucket name
2. Click "Policies" 
3. Click "New Policy"
4. Choose from templates:
   - "Give users access to own folder" - Good starting point
   - Modify as needed based on the policies above

## Verification

After setting up, test by:
1. Try viewing an image (should work for anyone)
2. Try uploading an image while logged in (should work)
3. Try deleting someone else's image (should fail)

## Important Notes

- Both buckets should be set as **PUBLIC** buckets
- The `owner` field in storage.objects is automatically set to the user's ID when they upload
- These policies allow community contribution while protecting ownership