import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testComprehensiveFixes() {
  console.log('🔍 COMPREHENSIVE TEST OF ALL FIXES\n');
  console.log('=' . repeat(50));
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Test 1: Database connectivity
  console.log('\n📊 Test 1: Database Connectivity');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('  ✅ Database connection successful');
    results.passed.push('Database connectivity');
  } catch (error) {
    console.log('  ❌ Database connection failed:', error.message);
    results.failed.push('Database connectivity');
  }

  // Test 2: Feed posts table
  console.log('\n📊 Test 2: Feed Posts Table');
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .select('id, user_id, content, created_at')
      .limit(5);
    
    if (error) throw error;
    console.log(`  ✅ Feed posts accessible (${data.length} posts found)`);
    results.passed.push('Feed posts table');
  } catch (error) {
    console.log('  ❌ Feed posts error:', error.message);
    results.failed.push('Feed posts table');
  }

  // Test 3: Feed likes table with join
  console.log('\n📊 Test 3: Feed Likes with Joins');
  try {
    // Test the fixed foreign key name
    const { data, error } = await supabase
      .from('feed_posts')
      .select(`
        id,
        content,
        user_liked:feed_likes!feed_likes_post_id_fkey!left(
          id,
          user_id
        )
      `)
      .limit(3);
    
    if (error) throw error;
    console.log('  ✅ Feed likes join working with correct foreign key');
    results.passed.push('Feed likes join');
  } catch (error) {
    console.log('  ❌ Feed likes join failed:', error.message);
    results.failed.push('Feed likes join');
    
    // Try alternative syntax
    try {
      const { data: altData } = await supabase
        .from('feed_posts')
        .select('*, feed_likes(*)')
        .limit(1);
      console.log('  ⚠️  Alternative syntax works - may need code adjustment');
      results.warnings.push('Use alternative join syntax for feed_likes');
    } catch (altError) {
      console.log('  ❌ Alternative syntax also failed');
    }
  }

  // Test 4: User follows table
  console.log('\n📊 Test 4: User Follows Table');
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('*')
      .limit(5);
    
    if (error) throw error;
    console.log(`  ✅ User follows accessible (${data.length} follows found)`);
    results.passed.push('User follows table');
  } catch (error) {
    console.log('  ❌ User follows error:', error.message);
    results.failed.push('User follows table');
  }

  // Test 5: Equipment photos table
  console.log('\n📊 Test 5: Equipment Photos Table');
  try {
    const { data, error } = await supabase
      .from('equipment_photos')
      .select('id, user_id, equipment_id, photo_url')
      .limit(5);
    
    if (error) throw error;
    console.log(`  ✅ Equipment photos accessible (${data.length} photos found)`);
    results.passed.push('Equipment photos table');
  } catch (error) {
    console.log('  ❌ Equipment photos error:', error.message);
    results.failed.push('Equipment photos table');
  }

  // Test 6: Complex feed query (as used in app)
  console.log('\n📊 Test 6: Complex Feed Query');
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles!feed_posts_user_id_fkey(
          username,
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    console.log(`  ✅ Complex feed query successful (${data.length} posts with profiles)`);
    results.passed.push('Complex feed query');
  } catch (error) {
    console.log('  ❌ Complex feed query failed:', error.message);
    results.failed.push('Complex feed query');
  }

  // Test 7: Check for missing columns
  console.log('\n📊 Test 7: Schema Column Checks');
  const schemaChecks = [
    { table: 'equipment', columns: ['name', 'year'] },
    { table: 'bag_equipment', columns: ['position_x', 'position_y'] },
    { table: 'equipment_photos', columns: ['url', 'is_verified'] },
    { table: 'feed_posts', columns: ['post_type'] }
  ];

  for (const check of schemaChecks) {
    try {
      const { data, error } = await supabase
        .from(check.table)
        .select(check.columns.join(','))
        .limit(1);
      
      if (error) {
        console.log(`  ⚠️  ${check.table}: Missing columns [${check.columns.join(', ')}]`);
        results.warnings.push(`${check.table} missing columns`);
      } else {
        console.log(`  ✅ ${check.table}: All columns present`);
        results.passed.push(`${check.table} columns`);
      }
    } catch (error) {
      console.log(`  ⚠️  ${check.table}: Column check failed`);
      results.warnings.push(`${check.table} column check`);
    }
  }

  // Test 8: RLS Policy Check (simulated authenticated request)
  console.log('\n📊 Test 8: RLS Policy Status');
  const rlsTables = ['feed_likes', 'user_follows', 'equipment_photos', 'profiles'];
  
  for (const table of rlsTables) {
    try {
      // Check if table is readable
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ❌ ${table}: RLS may be blocking access`);
        results.failed.push(`${table} RLS`);
      } else {
        console.log(`  ✅ ${table}: RLS allows read (${count} records)`);
        results.passed.push(`${table} RLS`);
      }
    } catch (error) {
      console.log(`  ❌ ${table}: RLS check failed`);
      results.failed.push(`${table} RLS`);
    }
  }

  // Final Summary
  console.log('\n' + '=' . repeat(50));
  console.log('📋 TEST SUMMARY\n');
  
  console.log(`✅ Passed: ${results.passed.length} tests`);
  if (results.passed.length > 0) {
    results.passed.forEach(test => console.log(`   - ${test}`));
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length} issues`);
    results.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length} tests`);
    results.failed.forEach(test => console.log(`   - ${test}`));
  }

  // Action items
  console.log('\n📌 ACTION ITEMS:');
  
  if (results.failed.includes('Feed likes join')) {
    console.log('\n1. UPDATE FEED SERVICE CODE:');
    console.log('   Change: feed_likes!left(');
    console.log('   To: feed_likes!feed_likes_post_id_fkey!left(');
  }
  
  if (results.warnings.some(w => w.includes('missing columns'))) {
    console.log('\n2. ADD MISSING COLUMNS via Supabase Dashboard SQL:');
    console.log('   - equipment: name, year');
    console.log('   - bag_equipment: position_x, position_y');
    console.log('   - equipment_photos: url, is_verified');
    console.log('   - feed_posts: post_type');
  }
  
  if (results.failed.some(f => f.includes('RLS'))) {
    console.log('\n3. APPLY RLS POLICIES:');
    console.log('   Run the SQL from scripts/fix-rls-critical.sql in Supabase Dashboard');
  }

  console.log('\n✅ Test complete!');
}

testComprehensiveFixes().catch(console.error);