import { createAdminClient } from './supabase-admin.js';

async function quickFixProfile() {
  console.log('🚀 Quick Profile Fix');
  console.log('===================\n');
  
  const { supabase, error: clientError } = await createAdminClient();
  
  if (clientError) {
    console.error('❌ Failed to create admin client:', clientError);
    console.log('\n📝 Please run the SQL manually in Supabase:');
    console.log('   sql/fix-profile-system-complete.sql');
    return;
  }

  try {
    console.log('1️⃣ Enabling RLS on profiles table...');
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;' 
    });
    console.log('✅ RLS enabled');

    console.log('\n2️⃣ Making username nullable...');
    await supabase.rpc('exec_sql', { 
      sql: `
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'profiles' 
            AND column_name = 'username' AND is_nullable = 'NO'
          ) THEN
            ALTER TABLE profiles ALTER COLUMN username DROP NOT NULL;
          END IF;
        END $$;
      ` 
    });
    console.log('✅ Username is now nullable');

    console.log('\n3️⃣ Creating profile policies...');
    const policies = [
      `DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;`,
      `DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;`,
      `DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;`,
      `CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);`,
      `CREATE POLICY "Users can create their own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);`,
      `CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`
    ];

    for (const sql of policies) {
      await supabase.rpc('exec_sql', { sql });
    }
    console.log('✅ Profile policies created');

    console.log('\n4️⃣ Ensuring storage bucket is public...');
    await supabase.rpc('exec_sql', { 
      sql: `
        UPDATE storage.buckets 
        SET public = true 
        WHERE id = 'user-content';
      ` 
    });
    console.log('✅ Storage bucket is public');

    console.log('\n5️⃣ Creating simple storage policies...');
    const storagePolicies = [
      `DROP POLICY IF EXISTS "Public access to user-content" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Users can upload to their folder" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Users can update their files" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Users can delete their files" ON storage.objects;`,
      `CREATE POLICY "Public access to user-content" ON storage.objects FOR SELECT USING (bucket_id = 'user-content');`,
      `CREATE POLICY "Users can upload to their folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'user-content' AND (storage.foldername(name))[1] = 'avatars');`,
      `CREATE POLICY "Users can update their files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'user-content' AND owner = auth.uid()) WITH CHECK (bucket_id = 'user-content' AND owner = auth.uid());`,
      `CREATE POLICY "Users can delete their files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'user-content' AND owner = auth.uid());`
    ];

    for (const sql of storagePolicies) {
      try {
        await supabase.rpc('exec_sql', { sql });
      } catch (error) {
        if (!error.message.includes('does not exist')) {
          console.warn('⚠️  Storage policy warning:', error.message);
        }
      }
    }
    console.log('✅ Storage policies created');

    console.log('\n✅ Quick fix complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Try updating your profile again');
    console.log('2. If issues persist, run: node scripts/test-profile-permissions.js');
    console.log('3. Check browser console for specific errors');

  } catch (error) {
    console.error('❌ Error during quick fix:', error);
    console.log('\n📝 Please run the full SQL script manually:');
    console.log('1. Go to Supabase SQL Editor');
    console.log('2. Copy and run: sql/fix-profile-system-complete.sql');
  }
}

// Execute
console.log('This script will quickly fix common profile issues.\n');
quickFixProfile();