import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixFeedPostTypes() {
  console.log('\n🔧 Fixing Feed Post Types\n');
  console.log('========================\n');

  console.log('⚠️  IMPORTANT: The feed_posts table has a CHECK constraint that needs to be updated.\n');
  console.log('Please run the following SQL in your Supabase SQL editor:\n');
  console.log('----------------------------------------\n');
  
  const sql = `
-- Update feed_posts type constraint to include all needed types

-- 1. First, drop the existing constraint
ALTER TABLE feed_posts 
DROP CONSTRAINT IF EXISTS feed_posts_type_check;

-- 2. Add new constraint with all types used by the app
ALTER TABLE feed_posts 
ADD CONSTRAINT feed_posts_type_check 
CHECK (type IN (
  'new_equipment',      -- When equipment is added to bag
  'equipment_photo',    -- When equipment photo is uploaded
  'bag_update',         -- When bag is updated (legacy)
  'bag_created',        -- When bag is created
  'bag_updated',        -- When bag is updated
  'milestone',          -- For achievements
  'playing'             -- For playing updates
));

-- 3. Update equipment_photo type to match what FeedCard expects
-- Since our triggers create 'equipment_photo' but FeedCard might expect different structure
-- we'll keep both types for now

-- 4. Show the result
SELECT type, COUNT(*) as count 
FROM feed_posts 
GROUP BY type 
ORDER BY type;
`;

  console.log(sql);
  console.log('\n----------------------------------------\n');
  console.log('After running this SQL, the feed should work properly with all post types.\n');

  // Also show what we need to fix in the frontend
  console.log('Additionally, we need to ensure the frontend handles the data structure correctly.\n');
  console.log('The issue appears to be that equipment_photo posts have a different data structure');
  console.log('than other post types. The photo URL and equipment info are at the root level');
  console.log('instead of nested in a content object.\n');

  console.log('========================\n');
}

fixFeedPostTypes().catch(console.error);