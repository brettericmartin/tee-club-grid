import { supabase } from './supabase-admin.js';

async function auditAdminSystem() {
  console.log('=' .repeat(80));
  console.log('👨‍💼 ADMIN SYSTEM ARCHITECTURE AUDIT');
  console.log('=' .repeat(80));
  
  // Check both admin systems
  console.log('\n📊 CHECKING ADMIN TABLES/COLUMNS:');
  console.log('-'.repeat(40));
  
  // 1. Check profiles.is_admin column
  console.log('\n1. profiles.is_admin column:');
  const { data: profilesWithAdmin, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, is_admin')
    .eq('is_admin', true);
  
  if (profilesError) {
    if (profilesError.message.includes('column "is_admin"')) {
      console.log('   ❌ Column does not exist');
    } else {
      console.log('   ⚠️  Error:', profilesError.message);
    }
  } else {
    console.log('   ✅ Column exists');
    console.log(`   Found ${profilesWithAdmin?.length || 0} admin users`);
    profilesWithAdmin?.forEach(p => {
      console.log(`      - ${p.email || p.id}`);
    });
  }
  
  // 2. Check admins table
  console.log('\n2. admins table:');
  const { data: adminsTable, error: adminsError } = await supabase
    .from('admins')
    .select('*');
  
  if (adminsError) {
    if (adminsError.message.includes('does not exist')) {
      console.log('   ❌ Table does not exist');
    } else {
      console.log('   ⚠️  Error:', adminsError.message);
    }
  } else {
    console.log('   ✅ Table exists');
    console.log(`   Found ${adminsTable?.length || 0} admin records`);
    adminsTable?.forEach(a => {
      console.log(`      - User ID: ${a.user_id}`);
    });
  }
  
  // Check which system the code uses
  console.log('\n📝 CODE ANALYSIS:');
  console.log('-'.repeat(40));
  console.log('\nFrontend (React):');
  console.log('  📁 /src/hooks/useAdminAuth.ts');
  console.log('  ✅ Uses: profiles.is_admin');
  
  console.log('\nAPI Middleware:');
  console.log('  📁 /lib/middleware/adminAuth.ts');
  console.log('  ❌ Uses: admins table');
  
  console.log('\nAdmin Dashboard:');
  console.log('  📁 /src/pages/admin/WaitlistAdmin.tsx');
  console.log('  ✅ Uses: useAdminAuth hook (profiles.is_admin)');
  
  // RECOMMENDATION
  console.log('\n' + '=' .repeat(80));
  console.log('💡 RECOMMENDATION:');
  console.log('=' .repeat(80));
  
  console.log('\n🎯 USE profiles.is_admin EVERYWHERE');
  console.log('\nWhy:');
  console.log('  1. Already working in frontend');
  console.log('  2. Simpler architecture (one table)');
  console.log('  3. Profile already loaded for users');
  console.log('  4. Less joins and queries');
  
  console.log('\n📋 MIGRATION PLAN:');
  console.log('  1. Add is_admin column if missing');
  console.log('  2. Migrate admin users from admins table');
  console.log('  3. Update API middleware to use profiles.is_admin');
  console.log('  4. Drop admins table');
  
  console.log('\n🔧 QUICK FIX SQL:');
  console.log(`
-- Ensure is_admin column exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Migrate existing admins
UPDATE profiles 
SET is_admin = true 
WHERE id IN (SELECT user_id FROM admins);

-- Now the admins table can be dropped later
-- DROP TABLE IF EXISTS admins; -- Run after code is updated
  `);
  
  console.log('=' .repeat(80));
}

auditAdminSystem();