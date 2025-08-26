import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupRLSPolicies() {
  console.log('🔒 SETTING UP ROW LEVEL SECURITY POLICIES\n');
  console.log('=' .repeat(80));
  
  console.log(`
⚠️  IMPORTANT: RLS policies must be created via Supabase Dashboard SQL Editor
   
📋 Copy and run the following SQL in your Supabase Dashboard:
================================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- User bags policies (beta-gated for creation)
CREATE POLICY "Bags are viewable by everyone" 
  ON user_bags FOR SELECT 
  USING (true);

CREATE POLICY "Beta users can create bags" 
  ON user_bags FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.beta_access = true
      AND profiles.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can update own bags" 
  ON user_bags FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own bags" 
  ON user_bags FOR DELETE 
  USING (user_id = auth.uid());

-- Bag equipment policies (beta-gated)
CREATE POLICY "Bag equipment viewable by everyone" 
  ON bag_equipment FOR SELECT 
  USING (true);

CREATE POLICY "Beta users can add equipment to own bags" 
  ON bag_equipment FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_bags 
      JOIN profiles ON profiles.id = user_bags.user_id
      WHERE user_bags.id = bag_equipment.bag_id 
      AND user_bags.user_id = auth.uid()
      AND profiles.beta_access = true
      AND profiles.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can update equipment in own bags" 
  ON bag_equipment FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = bag_equipment.bag_id 
      AND user_bags.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove equipment from own bags" 
  ON bag_equipment FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = bag_equipment.bag_id 
      AND user_bags.user_id = auth.uid()
    )
  );

-- Equipment photos policies (beta-gated for upload)
CREATE POLICY "Equipment photos viewable by everyone" 
  ON equipment_photos FOR SELECT 
  USING (true);

CREATE POLICY "Beta users can upload photos" 
  ON equipment_photos FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.beta_access = true
      AND profiles.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can update own photos" 
  ON equipment_photos FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own photos" 
  ON equipment_photos FOR DELETE 
  USING (user_id = auth.uid());

-- Feed posts policies (beta-gated for creation)
CREATE POLICY "Feed posts viewable by everyone" 
  ON feed_posts FOR SELECT 
  USING (true);

CREATE POLICY "Beta users can create posts" 
  ON feed_posts FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.beta_access = true
      AND profiles.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can update own posts" 
  ON feed_posts FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own posts" 
  ON feed_posts FOR DELETE 
  USING (user_id = auth.uid());

-- Feed interactions (likes, comments) - beta-gated
CREATE POLICY "Feed likes viewable by everyone" 
  ON feed_likes FOR SELECT 
  USING (true);

CREATE POLICY "Beta users can like posts" 
  ON feed_likes FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.beta_access = true
      AND profiles.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can remove own likes" 
  ON feed_likes FOR DELETE 
  USING (user_id = auth.uid());

-- User follows policies (beta-gated)
CREATE POLICY "Follows viewable by everyone" 
  ON user_follows FOR SELECT 
  USING (true);

CREATE POLICY "Beta users can follow others" 
  ON user_follows FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.beta_access = true
      AND profiles.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can unfollow" 
  ON user_follows FOR DELETE 
  USING (follower_id = auth.uid());

-- Waitlist applications (admin only)
CREATE POLICY "Waitlist applications admin only" 
  ON waitlist_applications FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

================================================================================

📝 After running the above SQL, test the policies with:
   - node scripts/test-rls-policies.js
`);

  // Test current RLS status
  console.log('\n🔍 Checking current RLS status...\n');
  
  const tables = [
    'profiles',
    'user_bags',
    'bag_equipment',
    'equipment_photos',
    'feed_posts',
    'feed_likes',
    'user_follows'
  ];
  
  for (const table of tables) {
    try {
      // Try to select without auth - if it works, RLS might not be properly configured
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('row-level security')) {
        console.log(`✅ ${table}: RLS appears to be enabled`);
      } else if (data) {
        console.log(`⚠️  ${table}: Data accessible without auth - RLS may need configuration`);
      } else {
        console.log(`❓ ${table}: Status unclear`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Error checking - ${err.message}`);
    }
  }
  
  console.log('\n💡 Tips:');
  console.log('   1. Run the SQL above in Supabase Dashboard');
  console.log('   2. Test with a non-beta user to ensure restrictions work');
  console.log('   3. Monitor for any permission errors in the app');
}

setupRLSPolicies()
  .then(() => {
    console.log('\n✨ RLS policy documentation generated!');
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
  });