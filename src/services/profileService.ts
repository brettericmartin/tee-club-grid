import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - profile doesn't exist yet
      return null;
    }
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data;
}

export async function createProfile(userId: string, username: string): Promise<Profile | null> {
  // Build insert object dynamically based on what columns exist
  const insertData: any = {
    id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Only add username if it's a valid column (handle schema variations)
  if (username) {
    insertData.username = username;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    throw error;
  }

  return data;
}

export async function updateProfile(userId: string, updates: Partial<ProfileUpdate>): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return data;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  // Debug the incoming file
  console.log('Avatar upload - Starting upload for user:', userId);
  console.log('Avatar upload - File details:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  });

  // Validate file
  if (file.size === 0) {
    throw new Error('File is empty (0 bytes)');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error(`Invalid file type: ${file.type}`);
  }

  // Create a unique filename with userId as folder
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `avatars/${userId}/${fileName}`;

  console.log('Avatar upload - Upload path:', filePath);

  // Upload to Supabase Storage - IMPORTANT: Get the data response
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('user-content')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) {
    console.error('Avatar upload - Error:', uploadError);
    throw uploadError;
  }

  // Verify upload succeeded with data
  console.log('Avatar upload - Upload response:', uploadData);
  if (!uploadData?.path) {
    throw new Error('Upload succeeded but no path returned');
  }

  // Get the public URL
  const { data } = supabase.storage
    .from('user-content')
    .getPublicUrl(filePath);

  console.log('Avatar upload - Public URL:', data.publicUrl);

  // Verify the file exists by trying to list it
  const { data: listData, error: listError } = await supabase.storage
    .from('user-content')
    .list(`avatars/${userId}`, {
      limit: 1,
      search: fileName
    });

  if (listError) {
    console.error('Avatar upload - Could not verify file:', listError);
  } else {
    const uploadedFile = listData?.find(f => f.name === fileName);
    if (uploadedFile) {
      console.log('Avatar upload - File verified in storage:', uploadedFile);
    } else {
      console.warn('Avatar upload - File not found in listing after upload!');
    }
  }

  // Update the profile with the new avatar URL
  const updatedProfile = await updateProfile(userId, { avatar_url: data.publicUrl });
  console.log('Avatar upload - Profile updated:', updatedProfile);

  return data.publicUrl;
}