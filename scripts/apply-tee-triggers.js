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

async function applyTriggers() {
  console.log('🔧 Applying Missing Triggers for Tee System\n');

  const triggerSQL = `
-- Step 1: Add trigger to update likes_count on equipment_photos
CREATE OR REPLACE FUNCTION update_equipment_photo_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE equipment_photos 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE equipment_photos 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) 
    WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS equipment_photo_likes_count_trigger ON equipment_photo_likes;
CREATE TRIGGER equipment_photo_likes_count_trigger
AFTER INSERT OR DELETE ON equipment_photo_likes
FOR EACH ROW
EXECUTE FUNCTION update_equipment_photo_likes_count();

-- Step 2: Update existing counts to be accurate
UPDATE equipment_photos ep
SET likes_count = (
  SELECT COUNT(*) 
  FROM equipment_photo_likes 
  WHERE photo_id = ep.id
);

-- Step 3: Add trigger for bag_tees if not exists
CREATE OR REPLACE FUNCTION update_bag_tees_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_bags 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.bag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_bags 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) 
    WHERE id = OLD.bag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bag_tees_count_trigger ON bag_tees;
CREATE TRIGGER bag_tees_count_trigger
AFTER INSERT OR DELETE ON bag_tees
FOR EACH ROW
EXECUTE FUNCTION update_bag_tees_count();

-- Update bag counts
UPDATE user_bags ub
SET likes_count = (
  SELECT COUNT(*) 
  FROM bag_tees 
  WHERE bag_id = ub.id
);

-- Step 4: Add trigger for feed_likes if not exists
CREATE OR REPLACE FUNCTION update_feed_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feed_likes_count_trigger ON feed_likes;
CREATE TRIGGER feed_likes_count_trigger
AFTER INSERT OR DELETE ON feed_likes
FOR EACH ROW
EXECUTE FUNCTION update_feed_likes_count();

-- Update feed post counts
UPDATE feed_posts fp
SET likes_count = (
  SELECT COUNT(*) 
  FROM feed_likes 
  WHERE post_id = fp.id
);
`;

  console.log('📝 Triggers SQL prepared. You need to run this in Supabase Dashboard:\n');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Create a new query');
  console.log('4. Copy and paste the following SQL:\n');
  console.log('```sql');
  console.log(triggerSQL);
  console.log('```\n');
  console.log('5. Click "Run" to execute\n');

  // Test current state
  console.log('📊 Current state check:');
  
  try {
    // Check a sample photo's likes
    const { data: samplePhoto } = await supabase
      .from('equipment_photos')
      .select('id, likes_count')
      .gt('id', '00000000-0000-0000-0000-000000000000')
      .limit(1)
      .single();
    
    if (samplePhoto) {
      const { count: actualLikes } = await supabase
        .from('equipment_photo_likes')
        .select('*', { count: 'exact' })
        .eq('photo_id', samplePhoto.id);
      
      console.log(`Sample photo ${samplePhoto.id}:`);
      console.log(`  - likes_count column: ${samplePhoto.likes_count || 0}`);
      console.log(`  - actual likes in table: ${actualLikes || 0}`);
      
      if ((samplePhoto.likes_count || 0) !== (actualLikes || 0)) {
        console.log('  ⚠️  Mismatch detected - triggers needed!');
      } else {
        console.log('  ✅ Counts match');
      }
    }
  } catch (error) {
    console.error('Error checking state:', error.message);
  }

  console.log('\n✨ After running the SQL, tee counts will auto-update when users like/unlike items!');
}

applyTriggers();