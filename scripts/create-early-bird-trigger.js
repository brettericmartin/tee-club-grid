import { createAdminClient } from './supabase-admin.js';

const supabase = createAdminClient();

async function createEarlyBirdTrigger() {
  console.log('Creating Early Bird badge auto-award trigger...');

  try {
    // First, add a control flag to the early bird badge criteria
    console.log('Updating Early Bird badge criteria...');
    const { data: earlyBirdBadge, error: badgeError } = await supabase
      .from('badges')
      .select('id, criteria')
      .eq('name', 'early_bird_100')
      .single();

    if (badgeError) throw badgeError;

    // Update criteria to include auto_award flag
    const updatedCriteria = {
      ...earlyBirdBadge.criteria,
      auto_award: true // This can be set to false later to stop awarding
    };

    const { error: updateError } = await supabase
      .from('badges')
      .update({ criteria: updatedCriteria })
      .eq('id', earlyBirdBadge.id);

    if (updateError) throw updateError;

    // Create the function and trigger
    console.log('Creating trigger function...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create function to award Early Bird badge on signup
        CREATE OR REPLACE FUNCTION award_early_bird_badge()
        RETURNS TRIGGER AS $$
        DECLARE
          early_bird_badge_id UUID;
          should_auto_award BOOLEAN;
        BEGIN
          -- Get the Early Bird badge and check if auto_award is enabled
          SELECT id, (criteria->>'auto_award')::boolean 
          INTO early_bird_badge_id, should_auto_award
          FROM badges 
          WHERE name = 'early_bird_100' 
          AND is_active = true
          LIMIT 1;
          
          -- Only award if the badge exists and auto_award is true
          IF early_bird_badge_id IS NOT NULL AND should_auto_award = true THEN
            -- Check if user already has the badge (shouldn't happen on insert, but safe check)
            IF NOT EXISTS (
              SELECT 1 FROM user_badges 
              WHERE user_id = NEW.id 
              AND badge_id = early_bird_badge_id
            ) THEN
              -- Award the badge
              INSERT INTO user_badges (user_id, badge_id, earned_at, notification_seen)
              VALUES (NEW.id, early_bird_badge_id, NOW(), false);
            END IF;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Create trigger for new profile creation
        DROP TRIGGER IF EXISTS trigger_award_early_bird ON profiles;
        CREATE TRIGGER trigger_award_early_bird
          AFTER INSERT ON profiles
          FOR EACH ROW
          EXECUTE FUNCTION award_early_bird_badge();
      `
    });

    if (functionError) throw functionError;

    // Award Early Bird badge to all existing users
    console.log('Awarding Early Bird badge to existing users...');
    const { error: awardError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Award Early Bird badge to all existing users who don't have it
        INSERT INTO user_badges (user_id, badge_id, earned_at, notification_seen)
        SELECT 
          p.id as user_id,
          b.id as badge_id,
          COALESCE(p.created_at, NOW()) as earned_at,
          true as notification_seen -- Don't spam existing users with notifications
        FROM profiles p
        CROSS JOIN badges b
        WHERE b.name = 'early_bird_100' 
        AND b.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM user_badges ub 
          WHERE ub.user_id = p.id 
          AND ub.badge_id = b.id
        );
      `
    });

    if (awardError) throw awardError;

    console.log('✅ Early Bird badge trigger created successfully!');
    console.log('\nTo disable Early Bird badge for new users:');
    console.log('1. Update the badge criteria to set auto_award = false');
    console.log('2. Existing badges will remain with users forever');

  } catch (error) {
    console.error('Error creating Early Bird trigger:', error);
    throw error;
  }
}

// Run the script
createEarlyBirdTrigger()
  .then(() => {
    console.log('\n✅ Early Bird trigger setup completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to create Early Bird trigger:', error);
    process.exit(1);
  });