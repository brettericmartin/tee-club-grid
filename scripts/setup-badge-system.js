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

async function setupBadgeSystem() {
  console.log('🏅 Setting up Badge System...\n');

  try {
    // 1. Create tables
    console.log('Creating badge tables...');
    const { error: tablesError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create badges table (main badge definitions)
        CREATE TABLE IF NOT EXISTS badges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          icon VARCHAR(50),
          category VARCHAR(50) CHECK (category IN (
            'equipment_explorer', 
            'social_golfer', 
            'gear_collector', 
            'community_contributor', 
            'milestone_achievement', 
            'special_event'
          )),
          tier VARCHAR(20) CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create badge criteria table
        CREATE TABLE IF NOT EXISTS badge_criteria (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
          criteria_type VARCHAR(50) NOT NULL,
          threshold INTEGER NOT NULL,
          parameters JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create user actions tracking table
        CREATE TABLE IF NOT EXISTS user_actions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          action_type VARCHAR(50) NOT NULL,
          action_data JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create badge notifications table
        CREATE TABLE IF NOT EXISTS badge_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Add indexes for performance
        CREATE INDEX IF NOT EXISTS idx_user_actions_user_type ON user_actions(user_id, action_type);
        CREATE INDEX IF NOT EXISTS idx_user_actions_created ON user_actions(created_at);
        CREATE INDEX IF NOT EXISTS idx_badge_criteria_badge ON badge_criteria(badge_id);
        CREATE INDEX IF NOT EXISTS idx_badge_notifications_user ON badge_notifications(user_id, is_read);
        
        -- Ensure user_badges has correct structure
        ALTER TABLE user_badges 
        ADD COLUMN IF NOT EXISTS progress_data JSONB DEFAULT '{}';
      `
    });

    if (tablesError) {
      console.error('Error creating tables:', tablesError);
      // Try alternative approach
      await createTablesAlternative();
    } else {
      console.log('✅ Badge tables created successfully');
    }

    // 2. Insert badge definitions
    console.log('\nInserting badge definitions...');
    await insertBadgeDefinitions();

    // 3. Create badge checking function
    console.log('\nCreating badge checking functions...');
    await createBadgeFunctions();

    // 4. Set up RLS policies
    console.log('\nSetting up RLS policies...');
    await setupRLSPolicies();

    // 5. Fix existing user badges
    console.log('\nMigrating existing user badges...');
    await migrateExistingBadges();

    console.log('\n✨ Badge system setup complete!');

  } catch (error) {
    console.error('Setup error:', error);
  }
}

async function createTablesAlternative() {
  // Alternative approach: create tables one by one
  console.log('Using alternative table creation method...');
  
  // Since we can't use exec_sql, we'll check if tables exist by querying them
  const tables = ['badges', 'badge_criteria', 'user_actions', 'badge_notifications'];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error && error.code === '42P01') {
      console.log(`❌ Table ${table} needs to be created manually in Supabase`);
    } else {
      console.log(`✅ Table ${table} exists`);
    }
  }
}

async function insertBadgeDefinitions() {
  const badges = [
    // Early Adopter
    {
      name: 'Early Bird',
      description: 'One of the first members of Teed.club',
      icon: '🌅',
      category: 'special_event',
      tier: 'gold',
      sort_order: 1
    },
    
    // Photo Contributors (Tiered)
    {
      name: 'Photo Rookie',
      description: 'Upload 5 equipment photos',
      icon: '📸',
      category: 'community_contributor',
      tier: 'bronze',
      sort_order: 10
    },
    {
      name: 'Photo Pro',
      description: 'Upload 25 equipment photos',
      icon: '📸',
      category: 'community_contributor',
      tier: 'silver',
      sort_order: 11
    },
    {
      name: 'Photo Master',
      description: 'Upload 50 equipment photos',
      icon: '📸',
      category: 'community_contributor',
      tier: 'gold',
      sort_order: 12
    },
    {
      name: 'Photo Legend',
      description: 'Upload 100 equipment photos',
      icon: '📸',
      category: 'community_contributor',
      tier: 'platinum',
      sort_order: 13
    },
    
    // Equipment Explorers
    {
      name: 'Equipment Scout',
      description: 'Add 5 new equipment items to the platform',
      icon: '🔍',
      category: 'equipment_explorer',
      tier: 'bronze',
      sort_order: 20
    },
    {
      name: 'Equipment Hunter',
      description: 'Add 15 new equipment items to the platform',
      icon: '🔍',
      category: 'equipment_explorer',
      tier: 'silver',
      sort_order: 21
    },
    {
      name: 'Equipment Master',
      description: 'Add 30 new equipment items to the platform',
      icon: '🔍',
      category: 'equipment_explorer',
      tier: 'gold',
      sort_order: 22
    },
    
    // Brand Specialists
    {
      name: 'TaylorMade Fan',
      description: 'Have 3+ TaylorMade items in your bag',
      icon: '⛳',
      category: 'gear_collector',
      tier: 'silver',
      sort_order: 30
    },
    {
      name: 'Callaway Enthusiast',
      description: 'Have 3+ Callaway items in your bag',
      icon: '⛳',
      category: 'gear_collector',
      tier: 'silver',
      sort_order: 31
    },
    {
      name: 'Titleist Loyalist',
      description: 'Have 3+ Titleist items in your bag',
      icon: '⛳',
      category: 'gear_collector',
      tier: 'silver',
      sort_order: 32
    },
    
    // Bag Builders
    {
      name: 'Bag Builder',
      description: 'Create your first complete bag',
      icon: '🎒',
      category: 'milestone_achievement',
      tier: 'bronze',
      sort_order: 40
    },
    {
      name: 'Bag Architect',
      description: 'Create 3 different bags',
      icon: '🎒',
      category: 'milestone_achievement',
      tier: 'silver',
      sort_order: 41
    },
    {
      name: 'Bag Master',
      description: 'Have a bag with 50+ likes',
      icon: '🎒',
      category: 'milestone_achievement',
      tier: 'gold',
      sort_order: 42
    },
    
    // Social Badges
    {
      name: 'Friendly Golfer',
      description: 'Follow 10 other golfers',
      icon: '👥',
      category: 'social_golfer',
      tier: 'bronze',
      sort_order: 50
    },
    {
      name: 'Social Butterfly',
      description: 'Have 25 followers',
      icon: '👥',
      category: 'social_golfer',
      tier: 'silver',
      sort_order: 51
    },
    {
      name: 'Golf Influencer',
      description: 'Have 100 followers',
      icon: '👥',
      category: 'social_golfer',
      tier: 'gold',
      sort_order: 52
    },
    
    // Special Achievement
    {
      name: 'Full Bag',
      description: 'Have all 14 club slots filled in a bag',
      icon: '💼',
      category: 'gear_collector',
      tier: 'gold',
      sort_order: 60
    },
    {
      name: 'Brand Ambassador',
      description: 'Have all clubs from a single brand',
      icon: '🏆',
      category: 'gear_collector',
      tier: 'platinum',
      sort_order: 61
    }
  ];

  // Insert badges
  for (const badge of badges) {
    const { data: existing } = await supabase
      .from('badges')
      .select('id')
      .eq('name', badge.name)
      .single();

    if (!existing) {
      const { error } = await supabase
        .from('badges')
        .insert(badge);
      
      if (error) {
        console.error(`Error inserting badge ${badge.name}:`, error);
      } else {
        console.log(`✅ Created badge: ${badge.name}`);
      }
    }
  }

  // Now add criteria for each badge
  await insertBadgeCriteria();
}

async function insertBadgeCriteria() {
  const criteria = [
    // Photo badges
    { badge_name: 'Photo Rookie', criteria_type: 'photos_uploaded', threshold: 5 },
    { badge_name: 'Photo Pro', criteria_type: 'photos_uploaded', threshold: 25 },
    { badge_name: 'Photo Master', criteria_type: 'photos_uploaded', threshold: 50 },
    { badge_name: 'Photo Legend', criteria_type: 'photos_uploaded', threshold: 100 },
    
    // Equipment badges
    { badge_name: 'Equipment Scout', criteria_type: 'equipment_added', threshold: 5 },
    { badge_name: 'Equipment Hunter', criteria_type: 'equipment_added', threshold: 15 },
    { badge_name: 'Equipment Master', criteria_type: 'equipment_added', threshold: 30 },
    
    // Brand badges
    { badge_name: 'TaylorMade Fan', criteria_type: 'brand_items', threshold: 3, parameters: { brand: 'TaylorMade' } },
    { badge_name: 'Callaway Enthusiast', criteria_type: 'brand_items', threshold: 3, parameters: { brand: 'Callaway' } },
    { badge_name: 'Titleist Loyalist', criteria_type: 'brand_items', threshold: 3, parameters: { brand: 'Titleist' } },
    
    // Bag badges
    { badge_name: 'Bag Builder', criteria_type: 'bags_created', threshold: 1 },
    { badge_name: 'Bag Architect', criteria_type: 'bags_created', threshold: 3 },
    { badge_name: 'Bag Master', criteria_type: 'bag_likes', threshold: 50 },
    
    // Social badges
    { badge_name: 'Friendly Golfer', criteria_type: 'following_count', threshold: 10 },
    { badge_name: 'Social Butterfly', criteria_type: 'follower_count', threshold: 25 },
    { badge_name: 'Golf Influencer', criteria_type: 'follower_count', threshold: 100 },
    
    // Special badges
    { badge_name: 'Full Bag', criteria_type: 'bag_equipment_count', threshold: 14 },
    { badge_name: 'Brand Ambassador', criteria_type: 'single_brand_bag', threshold: 1 }
  ];

  for (const criterion of criteria) {
    // Get badge ID
    const { data: badge } = await supabase
      .from('badges')
      .select('id')
      .eq('name', criterion.badge_name)
      .single();

    if (badge) {
      const { error } = await supabase
        .from('badge_criteria')
        .insert({
          badge_id: badge.id,
          criteria_type: criterion.criteria_type,
          threshold: criterion.threshold,
          parameters: criterion.parameters || {}
        });

      if (!error) {
        console.log(`✅ Added criteria for: ${criterion.badge_name}`);
      }
    }
  }
}

async function createBadgeFunctions() {
  // Since we can't create functions via RPC, provide the SQL
  console.log('\nℹ️  Run this SQL in Supabase SQL editor to create badge functions:');
  console.log(`
-- Function to check and award badges for a user
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TABLE(badge_id UUID, badge_name TEXT, newly_earned BOOLEAN) AS $$
DECLARE
  v_badge RECORD;
  v_progress INTEGER;
  v_earned BOOLEAN;
BEGIN
  -- Loop through all active badges
  FOR v_badge IN 
    SELECT b.*, bc.criteria_type, bc.threshold, bc.parameters
    FROM badges b
    JOIN badge_criteria bc ON b.id = bc.badge_id
    WHERE b.is_active = true
  LOOP
    -- Calculate progress based on criteria type
    v_progress := 0;
    
    CASE v_badge.criteria_type
      WHEN 'photos_uploaded' THEN
        SELECT COUNT(*) INTO v_progress
        FROM equipment_photos
        WHERE user_id = p_user_id;
        
      WHEN 'equipment_added' THEN
        SELECT COUNT(*) INTO v_progress
        FROM equipment
        WHERE added_by_user_id = p_user_id;
        
      WHEN 'bags_created' THEN
        SELECT COUNT(*) INTO v_progress
        FROM user_bags
        WHERE user_id = p_user_id;
        
      WHEN 'following_count' THEN
        SELECT COUNT(*) INTO v_progress
        FROM user_follows
        WHERE follower_id = p_user_id;
        
      WHEN 'follower_count' THEN
        SELECT COUNT(*) INTO v_progress
        FROM user_follows
        WHERE following_id = p_user_id;
        
      -- Add more criteria types as needed
    END CASE;
    
    -- Check if badge is earned
    v_earned := v_progress >= v_badge.threshold;
    
    -- Update or insert user_badge record
    INSERT INTO user_badges (user_id, badge_id, progress, earned_at)
    VALUES (
      p_user_id, 
      v_badge.id, 
      LEAST(100, (v_progress::FLOAT / v_badge.threshold * 100)::INTEGER),
      CASE WHEN v_earned THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) DO UPDATE
    SET 
      progress = EXCLUDED.progress,
      earned_at = CASE 
        WHEN user_badges.earned_at IS NULL AND EXCLUDED.earned_at IS NOT NULL 
        THEN EXCLUDED.earned_at 
        ELSE user_badges.earned_at 
      END;
    
    -- Return newly earned badges
    IF v_earned AND NOT EXISTS (
      SELECT 1 FROM user_badges 
      WHERE user_id = p_user_id 
      AND badge_id = v_badge.id 
      AND earned_at IS NOT NULL
    ) THEN
      RETURN QUERY SELECT v_badge.id, v_badge.name, true;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
  `);
}

async function setupRLSPolicies() {
  console.log('\nℹ️  Run this SQL in Supabase SQL editor to set up RLS policies:');
  console.log(`
-- Enable RLS on badge tables
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_notifications ENABLE ROW LEVEL SECURITY;

-- Badges table - everyone can view
CREATE POLICY "Public can view badges" ON badges
  FOR SELECT USING (true);

-- Badge criteria - everyone can view
CREATE POLICY "Public can view badge criteria" ON badge_criteria
  FOR SELECT USING (true);

-- User actions - users can view their own
CREATE POLICY "Users can view own actions" ON user_actions
  FOR SELECT USING (auth.uid() = user_id);

-- User actions - authenticated users can insert their own
CREATE POLICY "Users can track own actions" ON user_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Badge notifications - users can view their own
CREATE POLICY "Users can view own notifications" ON badge_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Badge notifications - users can update their own (mark as read)
CREATE POLICY "Users can update own notifications" ON badge_notifications
  FOR UPDATE USING (auth.uid() = user_id);
  `);
}

async function migrateExistingBadges() {
  // Map existing user_badges to the new badge definitions
  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('*');

  console.log(`Found ${userBadges?.length || 0} existing user badges to migrate`);

  // Since we don't know what badge_ids were used before, 
  // we'll need to update them to match our new badge definitions
  if (userBadges && userBadges.length > 0) {
    // Get early bird badge ID
    const { data: earlyBird } = await supabase
      .from('badges')
      .select('id')
      .eq('name', 'Early Bird')
      .single();

    if (earlyBird) {
      // Update all existing badges to early bird (as a safe default)
      for (const ub of userBadges) {
        await supabase
          .from('user_badges')
          .update({ 
            badge_id: earlyBird.id,
            progress: 100,
            earned_at: ub.earned_at || new Date().toISOString()
          })
          .eq('id', ub.id);
      }
      console.log('✅ Migrated existing badges to Early Bird badge');
    }
  }
}

setupBadgeSystem().catch(console.error);