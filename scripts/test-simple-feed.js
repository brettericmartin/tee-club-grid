import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSimpleFeed() {
  console.log('\n🧪 Testing Simple Feed Query\n');
  console.log('===========================\n');

  try {
    // Test the simplified query
    const { data, error } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url,
          handicap
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Query error:', error);
    } else {
      console.log(`✅ Query successful! Found ${data?.length || 0} posts`);
      
      if (data && data.length > 0) {
        console.log('\nFirst post:', JSON.stringify(data[0], null, 2));
      }
    }

    console.log('\n===========================\n');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testSimpleFeed().catch(console.error);