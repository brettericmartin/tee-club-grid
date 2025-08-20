import { supabase } from './supabase-admin.js';

async function addTourChampionBadge() {
  console.log('🏌️ Adding Tour Champion badge...');
  
  try {
    // Step 1: Check if badge already exists
    console.log('Checking if Tour Champion badge exists...');
    const { data: existingBadge } = await supabase
      .from('badges')
      .select('id, name, description')
      .eq('name', 'Tour Champion')
      .single();
    
    if (existingBadge) {
      console.log('✅ Tour Champion badge already exists!');
      console.log('  ID:', existingBadge.id);
      console.log('  Name:', existingBadge.name);
      return;
    }
    
    // Step 2: Create the Tour Champion badge
    console.log('Creating Tour Champion badge...');
    const { data: badge, error: badgeError } = await supabase
      .from('badges')
      .insert({
        name: 'Tour Champion',
        description: 'Completed the Teed.club welcome tour and ready to tee off!',
        category: 'milestone_achievement', // Using enum value directly
        icon: '🏆', // Trophy emoji for icon field
        rarity: 'common',
        tier: 'bronze', // Using valid tier enum value
        sort_order: 1,
        is_active: true,
        is_dynamic: false
      })
      .select()
      .single();
    
    if (badgeError) {
      console.error('Error creating badge:', badgeError);
      return;
    }
    
    console.log('✅ Tour Champion badge created successfully!');
    console.log('  Badge ID:', badge.id);
    console.log('  Name:', badge.name);
    
    // Step 3: Add badge criteria
    console.log('Adding badge criteria...');
    const { data: criteria, error: criteriaError } = await supabase
      .from('badge_criteria')
      .insert({
        badge_id: badge.id,
        criteria_type: 'onboarding_complete',
        threshold: 1,
        parameters: {
          description: 'Complete all 5 steps of the onboarding tour'
        }
      })
      .select()
      .single();
    
    if (criteriaError) {
      console.error('Error creating criteria:', criteriaError);
    } else {
      console.log('✅ Badge criteria added successfully!');
    }
    
    console.log('\n🎉 Setup complete! Tour Champion badge is ready.');
    console.log('\nThe badge will be automatically awarded when a user completes all 5 onboarding steps.');
    
  } catch (error) {
    console.error('❌ Error setting up Tour Champion badge:', error);
  } finally {
    process.exit();
  }
}

// Run the setup
addTourChampionBadge();