import { supabase } from './supabase-admin.js';

async function checkTourChampionBadge() {
  console.log('Checking Tour Champion badge...\n');
  
  try {
    // Check if badge exists
    const { data: badge, error } = await supabase
      .from('badges')
      .select('*')
      .eq('name', 'tour_champion')
      .single();
    
    if (error && error.code === 'PGRST116') {
      console.log('❌ Tour Champion badge does NOT exist');
      console.log('Run: node scripts/add-tour-champion-badge.js');
    } else if (badge) {
      console.log('✅ Tour Champion badge exists!');
      console.log('Badge details:', {
        id: badge.id,
        name: badge.name,
        display_name: badge.display_name,
        description: badge.description
      });
      
      // Check if the RPC function exists
      console.log('\nChecking award_onboarding_badge function...');
      try {
        // Test with a dummy UUID
        const { data, error: rpcError } = await supabase.rpc('award_onboarding_badge', {
          p_user_id: '00000000-0000-0000-0000-000000000000'
        });
        
        if (rpcError) {
          if (rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
            console.log('❌ award_onboarding_badge function does NOT exist');
            console.log('The database function needs to be created');
          } else {
            console.log('✅ award_onboarding_badge function exists');
            console.log('Function test response:', data);
          }
        } else {
          console.log('✅ award_onboarding_badge function exists');
          console.log('Function test response:', data);
        }
      } catch (e) {
        console.log('❌ Error testing function:', e.message);
      }
    }
    
    // Check localStorage state
    console.log('\n📦 Local Storage Check:');
    console.log('To check your onboarding state in the browser console, run:');
    console.log('localStorage.getItem("teed_onboarding_state")');
    console.log('\nIf celebrated: true or badgeAwarded: true, the celebration won\'t show again');
    
  } catch (error) {
    console.error('Error checking badge:', error);
  } finally {
    process.exit();
  }
}

checkTourChampionBadge();