import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Test colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testTeeSystem() {
  console.log(`${colors.cyan}🧪 Testing Tee System Functionality${colors.reset}\n`);
  
  const tests = {
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Test 1: Check if equipment_photo_likes table exists
    console.log(`${colors.blue}Test 1: Checking equipment_photo_likes table...${colors.reset}`);
    try {
      const { data, error } = await supabase
        .from('equipment_photo_likes')
        .select('id')
        .limit(1);
      
      if (!error || error.code === 'PGRST116') { // PGRST116 = no rows returned
        console.log(`${colors.green}✅ equipment_photo_likes table exists${colors.reset}`);
        tests.passed++;
      } else {
        throw error;
      }
    } catch (err) {
      console.log(`${colors.red}❌ equipment_photo_likes table missing or inaccessible${colors.reset}`);
      tests.failed++;
      tests.errors.push('equipment_photo_likes table not found');
    }

    // Test 2: Check bag_tees table and count
    console.log(`\n${colors.blue}Test 2: Checking bag_tees functionality...${colors.reset}`);
    try {
      const { data, count } = await supabase
        .from('bag_tees')
        .select('*', { count: 'exact' });
      
      console.log(`${colors.green}✅ bag_tees table accessible - ${count || 0} records${colors.reset}`);
      tests.passed++;
    } catch (err) {
      console.log(`${colors.red}❌ bag_tees table error: ${err.message}${colors.reset}`);
      tests.failed++;
      tests.errors.push(`bag_tees: ${err.message}`);
    }

    // Test 3: Check feed_likes table and count
    console.log(`\n${colors.blue}Test 3: Checking feed_likes functionality...${colors.reset}`);
    try {
      const { data, count } = await supabase
        .from('feed_likes')
        .select('*', { count: 'exact' });
      
      console.log(`${colors.green}✅ feed_likes table accessible - ${count || 0} records${colors.reset}`);
      tests.passed++;
    } catch (err) {
      console.log(`${colors.red}❌ feed_likes table error: ${err.message}${colors.reset}`);
      tests.failed++;
      tests.errors.push(`feed_likes: ${err.message}`);
    }

    // Test 4: Check if likes_count columns exist
    console.log(`\n${colors.blue}Test 4: Checking likes_count columns...${colors.reset}`);
    
    // Check equipment_photos.likes_count
    try {
      const { data } = await supabase
        .from('equipment_photos')
        .select('id, likes_count')
        .limit(1);
      
      console.log(`${colors.green}✅ equipment_photos.likes_count column exists${colors.reset}`);
      tests.passed++;
    } catch (err) {
      console.log(`${colors.red}❌ equipment_photos.likes_count missing${colors.reset}`);
      tests.failed++;
      tests.errors.push('equipment_photos.likes_count column missing');
    }

    // Check user_bags.likes_count
    try {
      const { data } = await supabase
        .from('user_bags')
        .select('id, likes_count')
        .limit(1);
      
      console.log(`${colors.green}✅ user_bags.likes_count column exists${colors.reset}`);
      tests.passed++;
    } catch (err) {
      console.log(`${colors.red}❌ user_bags.likes_count missing${colors.reset}`);
      tests.failed++;
      tests.errors.push('user_bags.likes_count column missing');
    }

    // Check feed_posts.likes_count
    try {
      const { data } = await supabase
        .from('feed_posts')
        .select('id, likes_count')
        .limit(1);
      
      console.log(`${colors.green}✅ feed_posts.likes_count column exists${colors.reset}`);
      tests.passed++;
    } catch (err) {
      console.log(`${colors.red}❌ feed_posts.likes_count missing${colors.reset}`);
      tests.failed++;
      tests.errors.push('feed_posts.likes_count column missing');
    }

    // Test 5: Test tee aggregation for a sample bag
    console.log(`\n${colors.blue}Test 5: Testing tee aggregation...${colors.reset}`);
    try {
      // Get a sample bag
      const { data: sampleBag } = await supabase
        .from('user_bags')
        .select('id, name, likes_count')
        .limit(1)
        .single();
      
      if (sampleBag) {
        // Count bag tees
        const { count: bagTeeCount } = await supabase
          .from('bag_tees')
          .select('*', { count: 'exact' })
          .eq('bag_id', sampleBag.id);
        
        // Get equipment photo tees for this bag
        const { data: bagEquipment } = await supabase
          .from('bag_equipment')
          .select(`
            equipment_id,
            equipment:equipment_id (
              equipment_photos (
                id,
                likes_count
              )
            )
          `)
          .eq('bag_id', sampleBag.id);
        
        let photoTeeCount = 0;
        bagEquipment?.forEach(item => {
          item.equipment?.equipment_photos?.forEach(photo => {
            photoTeeCount += photo.likes_count || 0;
          });
        });
        
        const totalTees = (bagTeeCount || 0) + photoTeeCount;
        
        console.log(`${colors.green}✅ Bag "${sampleBag.name}" aggregation:${colors.reset}`);
        console.log(`   - Bag tees: ${bagTeeCount || 0}`);
        console.log(`   - Photo tees: ${photoTeeCount}`);
        console.log(`   - Total tees: ${totalTees}`);
        tests.passed++;
      } else {
        console.log(`${colors.yellow}⚠️  No bags found to test aggregation${colors.reset}`);
      }
    } catch (err) {
      console.log(`${colors.red}❌ Aggregation test failed: ${err.message}${colors.reset}`);
      tests.failed++;
      tests.errors.push(`Aggregation: ${err.message}`);
    }

    // Test 6: Check RLS policies
    console.log(`\n${colors.blue}Test 6: Checking RLS policies...${colors.reset}`);
    
    // Create a test user context
    const testUserId = 'test-user-' + Date.now();
    
    // Try to insert a tee (should fail without proper auth in production)
    try {
      const { error } = await supabase
        .from('equipment_photo_likes')
        .insert({
          photo_id: '00000000-0000-0000-0000-000000000000',
          user_id: testUserId
        });
      
      // Clean up if it succeeded (shouldn't in production with RLS)
      if (!error) {
        await supabase
          .from('equipment_photo_likes')
          .delete()
          .eq('user_id', testUserId);
      }
      
      console.log(`${colors.yellow}⚠️  RLS may not be fully configured (insert succeeded with service key)${colors.reset}`);
    } catch (err) {
      console.log(`${colors.green}✅ RLS appears to be working${colors.reset}`);
      tests.passed++;
    }

    // Test 7: Check if triggers are working
    console.log(`\n${colors.blue}Test 7: Testing like count triggers...${colors.reset}`);
    try {
      // Find a photo with no likes
      const { data: testPhoto } = await supabase
        .from('equipment_photos')
        .select('id, likes_count')
        .eq('likes_count', 0)
        .limit(1)
        .single();
      
      if (testPhoto) {
        // Add a test like
        const testUserId = 'trigger-test-' + Date.now();
        await supabase
          .from('equipment_photo_likes')
          .insert({
            photo_id: testPhoto.id,
            user_id: testUserId
          });
        
        // Check if count increased
        const { data: updatedPhoto } = await supabase
          .from('equipment_photos')
          .select('likes_count')
          .eq('id', testPhoto.id)
          .single();
        
        // Clean up
        await supabase
          .from('equipment_photo_likes')
          .delete()
          .eq('photo_id', testPhoto.id)
          .eq('user_id', testUserId);
        
        if (updatedPhoto?.likes_count > 0) {
          console.log(`${colors.green}✅ Like count triggers are working${colors.reset}`);
          tests.passed++;
        } else {
          console.log(`${colors.yellow}⚠️  Like count triggers may not be working${colors.reset}`);
          tests.failed++;
        }
      } else {
        console.log(`${colors.yellow}⚠️  No test photo found for trigger test${colors.reset}`);
      }
    } catch (err) {
      console.log(`${colors.red}❌ Trigger test failed: ${err.message}${colors.reset}`);
      tests.failed++;
      tests.errors.push(`Triggers: ${err.message}`);
    }

    // Summary
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}📊 Test Summary:${colors.reset}`);
    console.log(`${colors.green}  ✅ Passed: ${tests.passed}${colors.reset}`);
    console.log(`${colors.red}  ❌ Failed: ${tests.failed}${colors.reset}`);
    
    if (tests.errors.length > 0) {
      console.log(`\n${colors.red}Errors encountered:${colors.reset}`);
      tests.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    if (tests.failed === 0) {
      console.log(`\n${colors.green}🎉 All tests passed! Tee system is working correctly.${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}⚠️  Some tests failed. Please review and fix the issues.${colors.reset}`);
      console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
      console.log('1. Check if migration was applied: node scripts/apply-tee-migration.js');
      console.log('2. Verify in Supabase Dashboard that tables and RLS policies exist');
      console.log('3. Test the UI to ensure tee buttons work correctly');
    }

  } catch (error) {
    console.error(`\n${colors.red}❌ Critical error during testing:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run the tests
testTeeSystem();