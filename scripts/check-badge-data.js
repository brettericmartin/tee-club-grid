import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBadgeData() {
  console.log('🔍 Checking Badge System Data');
  console.log('=============================\n');

  // 1. Check if badges table exists and has data
  console.log('1️⃣ Checking BADGES table...');
  try {
    const { data: badges, error, count } = await supabase
      .from('badges')
      .select('*', { count: 'exact' })
      .limit(5);
      
    if (error) {
      console.error('❌ Error accessing badges table:', error.message);
    } else {
      console.log(`✅ Badges table exists with ${count} badges`);
      if (badges && badges.length > 0) {
        console.log('Sample badges:');
        badges.forEach(badge => {
          console.log(`   - ${badge.icon} ${badge.name} (${badge.tier} - ${badge.category})`);
        });
      }
    }
  } catch (err) {
    console.error('❌ Failed to query badges table:', err.message);
  }

  console.log('\n2️⃣ Checking BADGE_CRITERIA table...');
  try {
    const { data: criteria, error, count } = await supabase
      .from('badge_criteria')
      .select('*, badges(name)')
      .limit(5);
      
    if (error) {
      console.error('❌ Error accessing badge_criteria table:', error.message);
    } else {
      console.log(`✅ Badge criteria table exists with ${count} criteria`);
      if (criteria && criteria.length > 0) {
        console.log('Sample criteria:');
        criteria.forEach(c => {
          console.log(`   - ${c.badges?.name || 'Unknown'}: ${c.criteria_type} >= ${c.threshold}`);
        });
      }
    }
  } catch (err) {
    console.error('❌ Failed to query badge_criteria table:', err.message);
  }

  console.log('\n3️⃣ Checking USER_BADGES table...');
  try {
    const { data: userBadges, error, count } = await supabase
      .from('user_badges')
      .select(`
        *,
        badges(name, icon),
        profiles(username, display_name)
      `, { count: 'exact' })
      .limit(10);
      
    if (error) {
      console.error('❌ Error accessing user_badges table:', error.message);
    } else {
      console.log(`✅ User badges table exists with ${count} awarded badges`);
      if (userBadges && userBadges.length > 0) {
        console.log('Recently awarded badges:');
        userBadges.forEach(ub => {
          const userName = ub.profiles?.display_name || ub.profiles?.username || 'Unknown';
          const badgeName = ub.badges?.name || 'Unknown';
          const icon = ub.badges?.icon || '🏅';
          console.log(`   - ${userName}: ${icon} ${badgeName} (${ub.progress}%)`);
        });
      } else {
        console.log('   ⚠️  No badges have been awarded to users yet!');
      }
    }
  } catch (err) {
    console.error('❌ Failed to query user_badges table:', err.message);
  }

  console.log('\n4️⃣ Checking USER badge counts...');
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        user_badges(count)
      `)
      .limit(10);
      
    if (error) {
      console.error('❌ Error checking user badge counts:', error.message);
    } else if (users) {
      console.log('User badge counts:');
      users.forEach(user => {
        const name = user.display_name || user.username || user.id;
        const badgeCount = user.user_badges?.[0]?.count || 0;
        console.log(`   - ${name}: ${badgeCount} badges`);
      });
    }
  } catch (err) {
    console.error('❌ Failed to check user badge counts:', err.message);
  }

  console.log('\n5️⃣ Checking specific BRAND badges...');
  try {
    const { data: brandBadges, error } = await supabase
      .from('badges')
      .select('*')
      .like('name', '% Owner')
      .limit(10);
      
    if (error) {
      console.error('❌ Error checking brand badges:', error.message);
    } else if (brandBadges) {
      console.log(`Found ${brandBadges.length} brand badges:`);
      brandBadges.forEach(badge => {
        console.log(`   - ${badge.icon} ${badge.name}`);
      });
    }
  } catch (err) {
    console.error('❌ Failed to check brand badges:', err.message);
  }

  console.log('\n6️⃣ Checking if rarity and is_dynamic columns exist...');
  try {
    const { data: sampleBadge, error } = await supabase
      .from('badges')
      .select('id, name, rarity, is_dynamic')
      .limit(1)
      .single();
      
    if (error) {
      console.error('❌ Error checking badge columns:', error.message);
      console.log('   You may need to run the badge migration SQL');
    } else if (sampleBadge) {
      console.log('✅ Badge columns exist:');
      console.log(`   - rarity: ${sampleBadge.rarity !== undefined ? '✓' : '✗'}`);
      console.log(`   - is_dynamic: ${sampleBadge.is_dynamic !== undefined ? '✓' : '✗'}`);
    }
  } catch (err) {
    console.error('❌ Failed to check badge columns:', err.message);
  }

  console.log('\n7️⃣ Testing BadgeService.getUserBadges function...');
  try {
    // Get first user ID
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
      
    if (users && users[0]) {
      const userId = users[0].id;
      const { data: userBadges, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge:badges (
            *,
            category:badge_categories (
              name,
              display_name
            )
          )
        `)
        .eq('user_id', userId);
        
      if (error) {
        console.error('❌ BadgeService query failed:', error.message);
        console.log('   Note: badge_categories table might not exist');
      } else {
        console.log(`✅ BadgeService query succeeded for user ${userId}`);
        console.log(`   Found ${userBadges?.length || 0} badges`);
      }
    }
  } catch (err) {
    console.error('❌ Failed to test BadgeService:', err.message);
  }

  console.log('\n✨ Badge data check complete!\n');
  
  // Summary
  console.log('📋 SUMMARY:');
  console.log('If you see errors above, you may need to:');
  console.log('1. Run the badge system SQL migration');
  console.log('2. Run the direct badge award script');
  console.log('3. Check that badge_categories table exists (or update queries)');
}

// Run the check
checkBadgeData();