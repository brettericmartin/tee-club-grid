import { createAdminClient } from './supabase-admin.js';

async function fixProfileSystem() {
  console.log('🔧 Fixing Profile System...\n');

  const { supabase, error: clientError } = await createAdminClient();
  
  if (clientError) {
    console.error('❌ Failed to create admin client:', clientError);
    return;
  }

  try {
    // 1. Check current policies
    console.log('1️⃣ Checking current storage policies...');
    const { data: currentPolicies, error: policyCheckError } = await supabase
      .rpc('get_policies_for_table', { 
        schema_name: 'storage', 
        table_name: 'objects' 
      });

    if (policyCheckError) {
      console.log('⚠️  Could not check policies (this is normal)');
    } else {
      console.log(`   Found ${currentPolicies?.length || 0} existing policies`);
    }

    // 2. Drop existing policies
    console.log('\n2️⃣ Dropping existing storage policies...');
    const dropPoliciesSQL = `
      DO $$ 
      DECLARE 
        pol record;
      BEGIN
        FOR pol IN 
          SELECT policyname 
          FROM pg_policies 
          WHERE tablename = 'objects' 
          AND schemaname = 'storage'
        LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        END LOOP;
      END $$;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropPoliciesSQL });
    if (dropError) {
      console.log('⚠️  Could not drop policies:', dropError.message);
    } else {
      console.log('✅ Dropped existing policies');
    }

    // 3. Create new storage policies
    console.log('\n3️⃣ Creating new storage policies...');
    const policies = [
      {
        name: 'Anyone can view user content',
        sql: `CREATE POLICY "Anyone can view user content"
              ON storage.objects FOR SELECT
              USING (bucket_id = 'user-content');`
      },
      {
        name: 'Authenticated users can upload avatars',
        sql: `CREATE POLICY "Authenticated users can upload avatars"
              ON storage.objects FOR INSERT
              TO authenticated
              WITH CHECK (
                bucket_id = 'user-content' AND
                (storage.foldername(name))[1] = 'avatars'
              );`
      },
      {
        name: 'Users can update own avatars',
        sql: `CREATE POLICY "Users can update own avatars"
              ON storage.objects FOR UPDATE
              TO authenticated
              USING (
                bucket_id = 'user-content' AND
                (storage.foldername(name))[1] = 'avatars' AND
                auth.uid()::text = (storage.foldername(name))[2]
              )
              WITH CHECK (
                bucket_id = 'user-content' AND
                (storage.foldername(name))[1] = 'avatars' AND
                auth.uid()::text = (storage.foldername(name))[2]
              );`
      },
      {
        name: 'Users can delete own avatars',
        sql: `CREATE POLICY "Users can delete own avatars"
              ON storage.objects FOR DELETE
              TO authenticated
              USING (
                bucket_id = 'user-content' AND
                (storage.foldername(name))[1] = 'avatars' AND
                auth.uid()::text = (storage.foldername(name))[2]
              );`
      }
    ];

    for (const policy of policies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
      if (error) {
        console.log(`❌ Failed to create policy "${policy.name}":`, error.message);
      } else {
        console.log(`✅ Created policy: ${policy.name}`);
      }
    }

    // 4. Ensure bucket exists and is public
    console.log('\n4️⃣ Checking user-content bucket...');
    const { data: buckets } = await supabase.storage.listBuckets();
    const userContentBucket = buckets?.find(b => b.name === 'user-content');
    
    if (!userContentBucket) {
      console.log('⚠️  user-content bucket not found. Creating...');
      const { error: createError } = await supabase.storage.createBucket('user-content', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });
      
      if (createError) {
        console.log('❌ Failed to create bucket:', createError.message);
      } else {
        console.log('✅ Created user-content bucket');
      }
    } else {
      console.log('✅ user-content bucket exists');
      if (!userContentBucket.public) {
        console.log('⚠️  Bucket is not public. Please make it public in Supabase dashboard.');
      }
    }

    // 5. Add display_name column if missing
    console.log('\n5️⃣ Checking profiles table schema...');
    const { error: schemaError } = await supabase.rpc('exec_sql', { 
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'display_name'
          ) THEN
            ALTER TABLE profiles ADD COLUMN display_name text;
          END IF;
          
          -- Set display_name to username where display_name is null
          UPDATE profiles 
          SET display_name = COALESCE(display_name, username)
          WHERE display_name IS NULL;
        END $$;
      `
    });
    
    if (schemaError) {
      console.log('⚠️  Could not check/add display_name column:', schemaError.message);
    } else {
      console.log('✅ Ensured display_name column exists');
    }

    // 6. Fix profile RLS policies
    console.log('\n6️⃣ Fixing profile RLS policies...');
    const profilePolicies = [
      `DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;`,
      `DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;`,
      `DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;`,
      `CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);`,
      `CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);`,
      `CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`
    ];

    for (const sql of profilePolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error && !error.message.includes('does not exist')) {
        console.log('⚠️  Policy operation warning:', error.message);
      }
    }
    console.log('✅ Profile RLS policies updated');

    // 7. Summary
    console.log('\n✅ Profile system fixes completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Run: node scripts/debug-profile-issues.js to verify');
    console.log('2. Test uploading a profile picture in the app');
    console.log('3. Check that display names appear correctly');
    
    console.log('\n⚠️  If you still have issues:');
    console.log('1. Run the SQL script directly in Supabase SQL Editor:');
    console.log('   sql/fix-avatar-storage-policies.sql');
    console.log('2. Check browser console for any 404 errors');
    console.log('3. Ensure the user-content bucket is set to PUBLIC in Supabase dashboard');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Execute
console.log('🚀 Profile System Fixer');
console.log('======================\n');
console.log('This script will fix:');
console.log('- Storage policies for avatar uploads');
console.log('- Profile table schema (add display_name)');
console.log('- RLS policies for profiles');
console.log('- Bucket configuration\n');

fixProfileSystem();