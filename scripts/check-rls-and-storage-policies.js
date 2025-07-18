const { supabase } = require('./supabase-admin.js');

async function checkRLSAndStoragePolicies() {
  console.log('🔍 Checking RLS and Storage Policies...\n');

  try {
    // 1. Check if RLS is enabled on profiles table
    console.log('1️⃣ Checking RLS status on profiles table...');
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles';
      `
    });

    if (rlsError) {
      console.error('❌ Error checking RLS status:', rlsError.message);
    } else if (rlsStatus && rlsStatus.length > 0) {
      const isEnabled = rlsStatus[0].rowsecurity;
      console.log(`   RLS on profiles table: ${isEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
      if (!isEnabled) {
        console.log('   ⚠️  RLS must be enabled for security!');
      }
    }

    // 2. Check profiles table policies
    console.log('\n2️⃣ Checking profiles table policies...');
    const { data: profilePolicies, error: profilePoliciesError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE tablename = 'profiles'
        AND schemaname = 'public'
        ORDER BY policyname;
      `
    });

    if (profilePoliciesError) {
      console.error('❌ Error checking profile policies:', profilePoliciesError.message);
    } else if (profilePolicies) {
      console.log(`   Found ${profilePolicies.length} policies:`);
      profilePolicies.forEach(policy => {
        console.log(`\n   📋 Policy: ${policy.policyname}`);
        console.log(`      Command: ${policy.cmd}`);
        console.log(`      Roles: ${policy.roles}`);
        console.log(`      Permissive: ${policy.permissive}`);
        if (policy.qual) console.log(`      USING: ${policy.qual}`);
        if (policy.with_check) console.log(`      WITH CHECK: ${policy.with_check}`);
      });

      // Check for essential policies
      const hasSelect = profilePolicies.some(p => p.cmd === 'SELECT');
      const hasInsert = profilePolicies.some(p => p.cmd === 'INSERT');
      const hasUpdate = profilePolicies.some(p => p.cmd === 'UPDATE');

      console.log('\n   Essential policies check:');
      console.log(`      SELECT: ${hasSelect ? '✅' : '❌ MISSING'}`);
      console.log(`      INSERT: ${hasInsert ? '✅' : '❌ MISSING'}`);
      console.log(`      UPDATE: ${hasUpdate ? '✅' : '❌ MISSING'}`);
    }

    // 3. Check storage bucket configuration
    console.log('\n3️⃣ Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          id,
          name,
          public,
          file_size_limit,
          allowed_mime_types
        FROM storage.buckets
        WHERE id = 'user-content';
      `
    });

    if (bucketsError) {
      console.error('❌ Error checking buckets:', bucketsError.message);
    } else if (buckets && buckets.length > 0) {
      const bucket = buckets[0];
      console.log(`   Bucket: ${bucket.id}`);
      console.log(`      Public: ${bucket.public ? '✅ YES' : '❌ NO (should be public)'}`);
      console.log(`      File size limit: ${bucket.file_size_limit || 'None'}`);
      console.log(`      Allowed types: ${bucket.allowed_mime_types || 'All'}`);
    } else {
      console.log('   ❌ user-content bucket NOT FOUND');
    }

    // 4. Check storage policies
    console.log('\n4️⃣ Checking storage policies...');
    const { data: storagePolicies, error: storagePoliciesError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        ORDER BY policyname;
      `
    });

    if (storagePoliciesError) {
      console.error('❌ Error checking storage policies:', storagePoliciesError.message);
    } else if (storagePolicies) {
      console.log(`   Found ${storagePolicies.length} storage policies:`);
      
      // Filter for user-content related policies
      const userContentPolicies = storagePolicies.filter(p => 
        p.policyname.toLowerCase().includes('user') || 
        p.policyname.toLowerCase().includes('content') ||
        p.policyname.toLowerCase().includes('avatar') ||
        (p.qual && p.qual.includes('user-content')) ||
        (p.with_check && p.with_check.includes('user-content'))
      );

      console.log(`   User-content related: ${userContentPolicies.length}`);
      
      userContentPolicies.forEach(policy => {
        console.log(`\n   📋 Policy: ${policy.policyname}`);
        console.log(`      Command: ${policy.cmd}`);
        console.log(`      Roles: ${policy.roles}`);
        console.log(`      Permissive: ${policy.permissive}`);
        if (policy.qual) console.log(`      USING: ${policy.qual.substring(0, 100)}...`);
        if (policy.with_check) console.log(`      WITH CHECK: ${policy.with_check.substring(0, 100)}...`);
      });

      // Check for essential storage policies
      const storageHasSelect = userContentPolicies.some(p => p.cmd === 'SELECT');
      const storageHasInsert = userContentPolicies.some(p => p.cmd === 'INSERT');
      const storageHasUpdate = userContentPolicies.some(p => p.cmd === 'UPDATE');
      const storageHasDelete = userContentPolicies.some(p => p.cmd === 'DELETE');

      console.log('\n   Essential storage policies check:');
      console.log(`      SELECT: ${storageHasSelect ? '✅' : '❌ MISSING'}`);
      console.log(`      INSERT: ${storageHasInsert ? '✅' : '❌ MISSING'}`);
      console.log(`      UPDATE: ${storageHasUpdate ? '✅' : '❌ MISSING'}`);
      console.log(`      DELETE: ${storageHasDelete ? '✅' : '❌ MISSING'}`);
    }

    // 5. Check column permissions on profiles
    console.log('\n5️⃣ Checking column-level permissions on profiles...');
    const { data: columnPerms, error: columnPermsError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          grantee,
          table_schema,
          table_name,
          privilege_type
        FROM information_schema.table_privileges
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND grantee IN ('authenticated', 'anon')
        ORDER BY grantee, privilege_type;
      `
    });

    if (columnPermsError) {
      console.error('❌ Error checking column permissions:', columnPermsError.message);
    } else if (columnPerms) {
      console.log('   Permissions:');
      const groupedPerms = {};
      columnPerms.forEach(perm => {
        if (!groupedPerms[perm.grantee]) {
          groupedPerms[perm.grantee] = [];
        }
        groupedPerms[perm.grantee].push(perm.privilege_type);
      });

      Object.entries(groupedPerms).forEach(([grantee, perms]) => {
        console.log(`      ${grantee}: ${perms.join(', ')}`);
      });
    }

    // 6. Summary and recommendations
    console.log('\n📊 Summary and Recommendations:');
    console.log('────────────────────────────────');
    
    console.log('\n🔧 To fix profile issues, ensure:');
    console.log('   1. RLS is enabled on profiles table');
    console.log('   2. Policies exist for SELECT (everyone), INSERT (authenticated), UPDATE (own profile)');
    console.log('   3. Proper GRANT permissions for authenticated and anon roles');
    
    console.log('\n🔧 To fix storage issues, ensure:');
    console.log('   1. user-content bucket exists and is PUBLIC');
    console.log('   2. Storage policies allow SELECT (anyone), INSERT/UPDATE/DELETE (authenticated)');
    console.log('   3. Path structure in policies matches your upload paths (avatars/${userId}/...)');

    console.log('\n💡 Run the SQL files in this order:');
    console.log('   1. create-user-content-bucket.sql (if bucket missing)');
    console.log('   2. fix-profile-policies.sql');
    console.log('   3. fix-avatar-storage-policies.sql (most comprehensive)');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkRLSAndStoragePolicies();