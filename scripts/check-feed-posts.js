import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFeedPosts() {
  console.log('\n📰 Checking Feed Posts\n');
  console.log('======================\n');

  try {
    // 1. Check all feed post types
    console.log('1. Feed post types in database:\n');
    
    const { data: types } = await supabase
      .from('feed_posts')
      .select('type')
      .order('type');
    
    const uniqueTypes = [...new Set(types?.map(t => t.type) || [])];
    console.log('Unique types:', uniqueTypes);

    // 2. Get equipment_photo posts
    console.log('\n2. Equipment photo posts:\n');
    
    const { data: equipmentPhotos, error } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url
        ),
        equipment (
          brand,
          model
        )
      `)
      .eq('type', 'equipment_photo')
      .limit(3);

    if (error) {
      console.error('Error fetching equipment photos:', error);
    } else if (equipmentPhotos && equipmentPhotos.length > 0) {
      console.log(`Found ${equipmentPhotos.length} equipment_photo posts:\n`);
      equipmentPhotos.forEach(post => {
        console.log('Post ID:', post.id);
        console.log('Type:', post.type);
        console.log('Content:', post.content);
        console.log('Media URLs:', post.media_urls);
        console.log('Equipment ID:', post.equipment_id);
        console.log('Equipment:', post.equipment);
        console.log('Profile:', post.profiles);
        console.log('---');
      });
    } else {
      console.log('No equipment_photo posts found');
    }

    // 3. Check feed_posts table structure
    console.log('\n3. Sample feed post structure:\n');
    
    const { data: samplePost } = await supabase
      .from('feed_posts')
      .select('*')
      .limit(1)
      .single();
    
    if (samplePost) {
      console.log('Columns:', Object.keys(samplePost));
    }

    console.log('\n======================\n');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkFeedPosts().catch(console.error);