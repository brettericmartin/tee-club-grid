import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

async function debugGoogleAuth() {
  console.log('🔍 Debugging Google Authentication Issues...\n');

  try {
    // 1. Check for profiles with Google metadata
    console.log('1️⃣ Checking profiles with Google/OAuth data...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, created_at, updated_at')
      .or('avatar_url.ilike.%googleusercontent%,avatar_url.ilike.%google%')
      .limit(5);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
    } else if (profiles && profiles.length > 0) {
      console.log(`Found ${profiles.length} profiles with Google avatars:`);
      profiles.forEach(p => {
        console.log(`  - ${p.username || 'NO USERNAME'} (${p.id})`);
        console.log(`    Avatar: ${p.avatar_url?.substring(0, 50)}...`);
        console.log(`    Display: ${p.display_name || 'NOT SET'}`);
      });
    } else {
      console.log('No profiles with Google avatars found');
    }

    // 2. Check auth.users for Google providers
    console.log('\n2️⃣ Checking auth.users table for Google providers...');
    const { data: authUsers, error: authError } = await supabase.rpc('get_google_auth_users');
    
    if (authError) {
      console.log('Cannot access auth.users directly (expected)');
      console.log('Will check through profiles instead');
    }

    // 3. Check for profile inconsistencies
    console.log('\n3️⃣ Checking for profile data inconsistencies...');
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .limit(20);

    if (!allError && allProfiles) {
      const issues = allProfiles.filter(p => {
        // Check for various issues
        return !p.username || 
               p.username === p.id || 
               (p.avatar_url && p.avatar_url.includes('googleusercontent') && !p.display_name);
      });

      if (issues.length > 0) {
        console.log(`⚠️  Found ${issues.length} profiles with potential issues:`);
        issues.forEach(p => {
          const problems = [];
          if (!p.username) problems.push('missing username');
          if (p.username === p.id) problems.push('username is UUID');
          if (p.avatar_url?.includes('googleusercontent') && !p.display_name) {
            problems.push('Google user without display name');
          }
          console.log(`  - ${p.id}: ${problems.join(', ')}`);
        });
      } else {
        console.log('✅ No obvious profile issues found');
      }
    }

    // 4. Check how avatar URLs are stored
    console.log('\n4️⃣ Analyzing avatar URL patterns...');
    const { data: avatarPatterns } = await supabase
      .from('profiles')
      .select('avatar_url')
      .not('avatar_url', 'is', null)
      .limit(10);

    if (avatarPatterns) {
      const patterns = {
        google: 0,
        supabase: 0,
        other: 0
      };

      avatarPatterns.forEach(p => {
        if (p.avatar_url.includes('googleusercontent')) patterns.google++;
        else if (p.avatar_url.includes('supabase')) patterns.supabase++;
        else patterns.other++;
      });

      console.log('Avatar URL sources:');
      console.log(`  - Google: ${patterns.google}`);
      console.log(`  - Supabase storage: ${patterns.supabase}`);
      console.log(`  - Other: ${patterns.other}`);
    }

    // 5. Create RPC function to check auth metadata
    console.log('\n5️⃣ Checking if we need to sync Google profile data...');
    console.log('Solution: Create a trigger to sync Google avatar on sign-in');
    
    const triggerSQL = `
-- Function to sync Google profile data on auth changes
CREATE OR REPLACE FUNCTION sync_google_profile_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a Google sign-in
  IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
    -- Update profile with Google data
    UPDATE profiles
    SET 
      avatar_url = COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        avatar_url
      ),
      display_name = COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        display_name
      ),
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS sync_google_profile_on_signin ON auth.users;
CREATE TRIGGER sync_google_profile_on_signin
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_google_profile_data();
`;

    console.log('\n📝 To fix Google profile sync issues, run this SQL:');
    console.log(triggerSQL);

  } catch (err) {
    console.error('Unexpected error:', err);
  }

  console.log('\n📊 Summary of Google Auth Issues:');
  console.log('1. Profile pictures changing: Google avatar URL is being overwritten');
  console.log('2. Username issues: Google users may not have usernames set properly');
  console.log('3. Solution: Need to preserve user-uploaded avatars vs Google avatars');
}

// Helper RPC function (may not exist)
async function createHelperFunction() {
  const sql = `
CREATE OR REPLACE FUNCTION get_google_auth_users()
RETURNS TABLE(id uuid, email text, provider text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    email,
    raw_app_meta_data->>'provider' as provider
  FROM auth.users
  WHERE raw_app_meta_data->>'provider' = 'google'
  LIMIT 10;
$$;
`;

  try {
    await supabase.rpc('exec_sql', { sql_query: sql });
  } catch (err) {
    // Function might not be available
  }
}

debugGoogleAuth();