import { createAdminClient } from './supabase-admin.js';

const supabase = createAdminClient();

async function createBadgeSystem() {
  console.log('Creating badge system tables...');

  try {
    // Create badge_categories table
    console.log('Creating badge_categories table...');
    const { error: categoriesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS badge_categories (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          display_name VARCHAR(100) NOT NULL,
          description TEXT,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    if (categoriesError) throw categoriesError;

    // Create badges table
    console.log('Creating badges table...');
    const { error: badgesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS badges (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          display_name VARCHAR(200) NOT NULL,
          description TEXT NOT NULL,
          category_id UUID REFERENCES badge_categories(id) ON DELETE SET NULL,
          icon_name VARCHAR(50), -- For icon component selection
          icon_color VARCHAR(20) DEFAULT '#10B981',
          rarity VARCHAR(20) CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')) DEFAULT 'common',
          tier INTEGER DEFAULT 1, -- For progressive badges (1, 2, 3, etc)
          criteria JSONB NOT NULL, -- Flexible criteria definition
          is_active BOOLEAN DEFAULT true,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add index for faster queries
        CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category_id);
        CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);
      `
    });
    if (badgesError) throw badgesError;

    // Create user_badges table
    console.log('Creating user_badges table...');
    const { error: userBadgesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_badges (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
          badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
          earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          progress JSONB DEFAULT '{}', -- Track progress for tiered badges
          is_featured BOOLEAN DEFAULT false, -- User can feature badges
          notification_seen BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, badge_id)
        );

        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
        CREATE INDEX IF NOT EXISTS idx_user_badges_featured ON user_badges(is_featured) WHERE is_featured = true;
      `
    });
    if (userBadgesError) throw userBadgesError;

    // Create user_actions table for tracking
    console.log('Creating user_actions table...');
    const { error: actionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_actions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
          action_type VARCHAR(50) NOT NULL, -- photo_upload, equipment_add, tee_given, etc
          action_data JSONB DEFAULT '{}', -- Flexible data storage
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add indexes for common queries
        CREATE INDEX IF NOT EXISTS idx_user_actions_user_type ON user_actions(user_id, action_type);
        CREATE INDEX IF NOT EXISTS idx_user_actions_created ON user_actions(created_at DESC);
      `
    });
    if (actionsError) throw actionsError;

    // Create badge_criteria_types table for reference
    console.log('Creating badge_criteria_types table...');
    const { error: criteriaTypesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS badge_criteria_types (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          type_name VARCHAR(50) NOT NULL UNIQUE,
          description TEXT,
          example_criteria JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    if (criteriaTypesError) throw criteriaTypesError;

    // Insert badge categories
    console.log('Inserting badge categories...');
    const { error: insertCategoriesError } = await supabase
      .from('badge_categories')
      .insert([
        { name: 'early_bird', display_name: 'Early Bird', description: 'Early adopters and pioneers', display_order: 1 },
        { name: 'photo_master', display_name: 'Photo Master', description: 'Equipment photography contributions', display_order: 2 },
        { name: 'equipment_expert', display_name: 'Equipment Expert', description: 'Equipment knowledge and additions', display_order: 3 },
        { name: 'brand_specialist', display_name: 'Brand Specialist', description: 'Brand expertise and loyalty', display_order: 4 },
        { name: 'community_builder', display_name: 'Community Builder', description: 'Social engagement and helpfulness', display_order: 5 },
        { name: 'collector', display_name: 'Collector', description: 'Bag value and variety achievements', display_order: 6 }
      ]);
    if (insertCategoriesError) throw insertCategoriesError;

    // Insert criteria types
    console.log('Inserting badge criteria types...');
    const { error: insertCriteriaError } = await supabase
      .from('badge_criteria_types')
      .insert([
        { 
          type_name: 'user_count',
          description: 'Awarded to first N users',
          example_criteria: { type: 'user_count', max_users: 100 }
        },
        { 
          type_name: 'photo_count',
          description: 'Based on number of photos uploaded',
          example_criteria: { type: 'photo_count', threshold: 5 }
        },
        { 
          type_name: 'equipment_count',
          description: 'Based on equipment added to platform',
          example_criteria: { type: 'equipment_count', threshold: 10 }
        },
        { 
          type_name: 'brand_equipment',
          description: 'Equipment from specific brand',
          example_criteria: { type: 'brand_equipment', brand: 'TaylorMade', threshold: 3 }
        },
        { 
          type_name: 'tees_given',
          description: 'Number of tees given to others',
          example_criteria: { type: 'tees_given', threshold: 50 }
        },
        { 
          type_name: 'bag_value',
          description: 'Total value of equipment in bag',
          example_criteria: { type: 'bag_value', threshold: 5000 }
        }
      ]);
    if (insertCriteriaError) throw insertCriteriaError;

    // Create RLS policies
    console.log('Creating RLS policies...');
    const policies = [
      // Badge categories - public read
      {
        table: 'badge_categories',
        name: 'public_read_badge_categories',
        definition: 'FOR SELECT USING (true)'
      },
      // Badges - public read
      {
        table: 'badges',
        name: 'public_read_badges',
        definition: 'FOR SELECT USING (is_active = true)'
      },
      // User badges - public read, owner write
      {
        table: 'user_badges',
        name: 'public_read_user_badges',
        definition: 'FOR SELECT USING (true)'
      },
      {
        table: 'user_badges',
        name: 'user_update_own_badges',
        definition: 'FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
      },
      // User actions - owner only
      {
        table: 'user_actions',
        name: 'user_read_own_actions',
        definition: 'FOR SELECT USING (auth.uid() = user_id)'
      },
      {
        table: 'user_actions',
        name: 'user_insert_own_actions',
        definition: 'FOR INSERT WITH CHECK (auth.uid() = user_id)'
      }
    ];

    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE ${policy.table} ENABLE ROW LEVEL SECURITY;
          CREATE POLICY IF NOT EXISTS ${policy.name} ON ${policy.table} ${policy.definition};
        `
      });
      if (policyError) {
        console.error(`Error creating policy ${policy.name}:`, policyError);
      }
    }

    console.log('Badge system tables created successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: node scripts/seed-initial-badges.js');
    console.log('2. Update user action triggers to track badge progress');
    console.log('3. Add badge display components to the UI');

  } catch (error) {
    console.error('Error creating badge system:', error);
    throw error;
  }
}

// Run the script
createBadgeSystem()
  .then(() => {
    console.log('\n✅ Badge system created successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to create badge system:', error);
    process.exit(1);
  });