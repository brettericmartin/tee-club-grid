import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFeedTypes() {
  console.log('\n🔍 Checking Feed Post Types\n');
  console.log('===========================\n');

  try {
    // Try to insert a test equipment_photo post
    console.log('1. Testing equipment_photo type...\n');
    
    const { data: testUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (testUser) {
      const { error } = await supabase
        .from('feed_posts')
        .insert({
          user_id: testUser.id,
          type: 'equipment_photo',
          content: 'Test equipment photo post'
        });

      if (error) {
        console.error('Error creating equipment_photo post:', error.message);
        console.log('\nThis suggests the type constraint doesn\'t allow "equipment_photo"');
        
        // Check what types are allowed
        if (error.message.includes('check constraint')) {
          console.log('\nThe feed_posts table has a CHECK constraint on the type column.');
          console.log('We need to update the constraint to allow "equipment_photo" type.');
        }
      } else {
        console.log('✅ Successfully created equipment_photo post!');
        
        // Clean up test post
        await supabase
          .from('feed_posts')
          .delete()
          .eq('content', 'Test equipment photo post');
      }
    }

    // Check existing types
    console.log('\n2. Existing post types:\n');
    
    const { data: types } = await supabase
      .from('feed_posts')
      .select('type, count')
      .select('type');
    
    const typeCounts = {};
    types?.forEach(t => {
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    });
    
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} posts`);
    });

    console.log('\n===========================\n');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkFeedTypes().catch(console.error);