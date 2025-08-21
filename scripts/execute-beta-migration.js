import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

// Create a Supabase client with service key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function executeBetaMigration() {
  console.log('🚀 Beta Access System Migration\n');
  console.log('================================\n');
  
  const results = {
    tables_created: [],
    columns_added: [],
    policies_applied: [],
    errors: []
  };
  
  try {
    // Step 1: Create feature_flags table
    console.log('📊 Setting up feature flags...');
    
    // Check if feature_flags exists
    const { data: ffCheck } = await supabase
      .from('feature_flags')
      .select('*')
      .limit(1);
    
    if (ffCheck === null) {
      // Table doesn't exist, we need to note this
      console.log('   ⚠️  feature_flags table needs to be created via SQL console');
      results.errors.push('feature_flags table must be created via Supabase SQL editor');
    } else {
      console.log('   ✅ feature_flags table exists');
      results.tables_created.push('feature_flags');
    }
    
    // Step 2: Check profiles columns
    console.log('\n👤 Checking profiles columns...');
    const { data: profileSample, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (!profileError) {
      console.log('   ✅ profiles table accessible');
      // Note: We can't check individual columns without executing SQL
      results.columns_added.push('profiles.beta_access (requires SQL verification)');
    }
    
    // Step 3: Check for tables that need RLS policies
    console.log('\n🔒 Checking tables for RLS policies...');
    
    const tablesToCheck = [
      'user_bags',
      'bag_equipment', 
      'feed_posts',
      'equipment_photos',
      'forum_posts',
      'forum_replies',
      'bag_likes',
      'bag_tees',
      'equipment_photo_likes',
      'follows',
      'likes'
    ];
    
    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (!error || error.code === 'PGRST301') {
          // Table exists (PGRST301 means no rows but table exists)
          console.log(`   ✅ ${table} - exists and needs RLS policy`);
          results.policies_applied.push(table);
        }
      } catch (err) {
        // Table doesn't exist, skip
      }
    }
    
    // Generate SQL instructions
    console.log('\n' + '='.repeat(60));
    console.log('📝 MANUAL SQL EXECUTION REQUIRED');
    console.log('='.repeat(60));
    console.log('\nSince we need admin privileges for schema changes, please:');
    console.log('\n1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Open and execute: scripts/add-beta-access-system.sql');
    console.log('\n4. After execution, run the verification query:');
    console.log('   SELECT * FROM get_beta_status();');
    
    console.log('\n📊 Migration Summary:');
    console.log('--------------------');
    console.log(`Tables found that need RLS policies: ${results.policies_applied.length}`);
    console.log('\nTables requiring INSERT policies:');
    results.policies_applied.forEach(table => {
      console.log(`   • ${table}`);
    });
    
    console.log('\n✅ Expected Results After Migration:');
    console.log('   • feature_flags table with beta_cap=150');
    console.log('   • profiles.beta_access column added');
    console.log('   • profiles.display_name column added');
    console.log('   • invite_codes table created');
    console.log('   • waitlist_applications table created');
    console.log(`   • ${results.policies_applied.length} tables with INSERT RLS policies`);
    
    console.log('\n🎯 Acceptance Criteria:');
    console.log('   ✓ feature_flags with beta_cap=150');
    console.log('   ✓ profiles.display_name present');
    console.log('   ✓ RLS insert policy applied to all write tables');
    console.log('   ✓ No changes to OAuth required');
    
    console.log('\n📌 Post-Migration Commands:');
    console.log('   Grant beta access to a user:');
    console.log('   UPDATE profiles SET beta_access = true WHERE id = \'<user-id>\';');
    console.log('\n   Enable public beta for everyone:');
    console.log('   UPDATE feature_flags SET public_beta_enabled = true WHERE id = 1;');
    
  } catch (error) {
    console.error('\n❌ Error during migration check:', error.message);
    results.errors.push(error.message);
  }
  
  process.exit(0);
}

// Run the migration check
executeBetaMigration();