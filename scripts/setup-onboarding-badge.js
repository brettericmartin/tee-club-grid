import { supabase } from './supabase-admin.js';

async function setupOnboardingBadge() {
  console.log('🏌️ Setting up Tour Champion badge...');
  
  try {
    // Step 1: Add columns to profiles table if they don't exist
    console.log('Adding onboarding columns to profiles table...');
    try {
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE profiles 
          ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
        `
      });
      if (alterError) {
        console.log('Note: Could not add columns via RPC, may need manual migration');
      }
    } catch (e) {
      // If RPC doesn't exist, that's okay - we'll handle it differently
      console.log('Note: Could not add columns via RPC, may need manual migration');
    }
    
    // Step 2: Check if badge category exists
    console.log('Checking for milestone_achievement category...');
    let { data: category } = await supabase
      .from('badge_categories')
      .select('id')
      .eq('name', 'milestone_achievement')
      .single();
    
    if (!category) {
      console.log('Creating milestone_achievement category...');
      const { data: newCategory, error: catError } = await supabase
        .from('badge_categories')
        .insert({
          name: 'milestone_achievement',
          display_name: 'Milestone Achievement',
          description: 'Special achievements and milestones',
          icon_name: 'trophy',
          sort_order: 5
        })
        .select()
        .single();
      
      if (catError) {
        console.error('Error creating category:', catError);
        return;
      }
      category = newCategory;
    }
    
    // Step 3: Check if badge already exists
    console.log('Checking if Tour Champion badge exists...');
    const { data: existingBadge } = await supabase
      .from('badges')
      .select('id')
      .eq('name', 'tour_champion')
      .single();
    
    if (existingBadge) {
      console.log('✅ Tour Champion badge already exists!');
      return;
    }
    
    // Step 4: Create the Tour Champion badge
    console.log('Creating Tour Champion badge...');
    const { data: badge, error: badgeError } = await supabase
      .from('badges')
      .insert({
        name: 'tour_champion',
        display_name: 'Tour Champion',
        description: 'Completed the Teed.club welcome tour and ready to tee off!',
        category_id: category.id,
        icon_name: 'golf-ball', // Will use golf ball icon
        icon_color: '#10B981', // Green color
        rarity: 'common',
        tier: 1,
        sort_order: 1,
        criteria: {
          type: 'onboarding_complete',
          threshold: 1,
          description: 'Complete all 5 steps of the onboarding tour'
        }
      })
      .select()
      .single();
    
    if (badgeError) {
      console.error('Error creating badge:', badgeError);
      return;
    }
    
    console.log('✅ Tour Champion badge created successfully!');
    console.log('Badge ID:', badge.id);
    
    // Step 5: Create database function for awarding badge
    console.log('Creating award function...');
    const functionSQL = `
      CREATE OR REPLACE FUNCTION award_onboarding_badge(p_user_id UUID)
      RETURNS JSONB AS $$
      DECLARE
        v_badge_id UUID;
        v_already_earned BOOLEAN;
        v_result JSONB;
      BEGIN
        -- Get badge ID
        SELECT id INTO v_badge_id 
        FROM badges 
        WHERE name = 'tour_champion';
        
        IF v_badge_id IS NULL THEN
          RETURN jsonb_build_object('success', false, 'error', 'Badge not found');
        END IF;
        
        -- Check if already earned
        SELECT EXISTS(
          SELECT 1 FROM user_badges 
          WHERE user_id = p_user_id AND badge_id = v_badge_id
        ) INTO v_already_earned;
        
        IF v_already_earned THEN
          RETURN jsonb_build_object('success', false, 'error', 'Badge already earned');
        END IF;
        
        -- Award badge
        INSERT INTO user_badges (user_id, badge_id, earned_at, progress)
        VALUES (p_user_id, v_badge_id, NOW(), 100)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
        
        -- Update profile
        UPDATE profiles 
        SET 
          onboarding_completed = true,
          onboarding_completed_at = NOW()
        WHERE id = p_user_id;
        
        -- Create notification
        INSERT INTO badge_notifications (user_id, badge_id)
        VALUES (p_user_id, v_badge_id);
        
        RETURN jsonb_build_object(
          'success', true, 
          'badge_id', v_badge_id,
          'badge_name', 'Tour Champion',
          'message', 'Congratulations! You earned the Tour Champion badge!'
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Note: This might fail if we don't have permission, but that's okay
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: functionSQL });
      if (error) {
        console.log('Note: Could not create function via RPC. You may need to run this SQL manually:');
        console.log(functionSQL);
      }
    } catch (e) {
      console.log('Note: Could not create function via RPC. You may need to run this SQL manually:');
      console.log(functionSQL);
    }
    
    console.log('✅ Setup complete! Tour Champion badge is ready.');
    console.log('');
    console.log('To award the badge to a user, call:');
    console.log("  await supabase.rpc('award_onboarding_badge', { p_user_id: userId })");
    
  } catch (error) {
    console.error('❌ Error setting up onboarding badge:', error);
  } finally {
    process.exit();
  }
}

// Run the setup
setupOnboardingBadge();