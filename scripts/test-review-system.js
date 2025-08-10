import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReviewSystem() {
  console.log('🧪 Testing Review System...\n');

  try {
    // 1. Test review_tees table exists
    console.log('1️⃣ Checking review_tees table...');
    const { data: teeTest, error: teeError } = await supabase
      .from('review_tees')
      .select('*')
      .limit(1);

    if (teeError && teeError.message.includes('does not exist')) {
      console.error('❌ review_tees table does not exist');
      return;
    }
    console.log('✅ review_tees table exists');

    // 2. Test equipment_reviews columns
    console.log('\n2️⃣ Checking equipment_reviews columns...');
    const { data: reviewTest, error: reviewError } = await supabase
      .from('equipment_reviews')
      .select('id, title, tee_count, rating, content')
      .limit(1);

    if (reviewError) {
      console.error('❌ Error checking equipment_reviews:', reviewError.message);
      return;
    }
    console.log('✅ equipment_reviews has required columns');

    // 3. Get sample equipment to test with
    console.log('\n3️⃣ Getting sample equipment...');
    const { data: equipment, error: equipError } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .limit(5);

    if (equipError || !equipment?.length) {
      console.error('❌ Could not fetch equipment');
      return;
    }

    console.log('✅ Found equipment:');
    equipment.forEach(e => {
      console.log(`   - ${e.brand} ${e.model} (${e.id})`);
    });

    // 4. Check existing reviews
    console.log('\n4️⃣ Checking existing reviews...');
    const { data: reviews, error: reviewsError } = await supabase
      .from('equipment_reviews')
      .select(`
        *,
        profiles (
          username,
          display_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (reviewsError) {
      console.error('❌ Error fetching reviews:', reviewsError.message);
    } else {
      console.log(`✅ Found ${reviews?.length || 0} reviews`);
      if (reviews?.length) {
        console.log('\n   Recent reviews:');
        reviews.forEach(r => {
          const user = r.profiles?.display_name || r.profiles?.username || 'Unknown';
          console.log(`   - ${user}: ${r.rating}⭐ - "${r.title || 'No title'}" (${r.tee_count || 0} tees)`);
        });
      }
    }

    // 5. Test review with joined data
    console.log('\n5️⃣ Testing review query with tees...');
    const equipmentId = equipment[0].id;
    const { data: reviewsWithTees, error: joinError } = await supabase
      .from('equipment_reviews')
      .select(`
        *,
        profiles (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('equipment_id', equipmentId)
      .order('tee_count', { ascending: false });

    if (joinError) {
      console.error('❌ Error with joined query:', joinError.message);
    } else {
      console.log(`✅ Successfully queried reviews for ${equipment[0].brand} ${equipment[0].model}`);
      console.log(`   Found ${reviewsWithTees?.length || 0} reviews`);
    }

    console.log('\n✅ Review system is set up correctly!');
    console.log('\n📝 Next steps:');
    console.log('1. Navigate to any equipment page');
    console.log('2. Click on the "Reviews" tab');
    console.log('3. Write a review and test the tee functionality');
    console.log('4. Check that reviews appear in both equipment pages and modals');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testReviewSystem();