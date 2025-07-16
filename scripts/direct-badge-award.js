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

async function awardEarlyAdopterBadges() {
  console.log('\n🏅 Awarding Early Adopter badges to all users...\n');
  
  try {
    // Get Early Adopter badge ID
    const { data: badge, error: badgeError } = await supabase
      .from('badges')
      .select('id')
      .eq('name', 'Early Adopter')
      .single();
      
    if (badgeError || !badge) {
      console.error('❌ Could not find Early Adopter badge');
      return;
    }
    
    console.log(`✅ Found Early Adopter badge: ${badge.id}`);
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, display_name');
      
    if (usersError || !users) {
      console.error('❌ Could not fetch users');
      return;
    }
    
    console.log(`👥 Found ${users.length} users\n`);
    
    // Award badge to each user
    for (const user of users) {
      console.log(`Processing ${user.display_name || user.username || user.id}...`);
      
      const { error } = await supabase
        .from('user_badges')
        .upsert({
          user_id: user.id,
          badge_id: badge.id,
          progress: 100,
          earned_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,badge_id'
        });
        
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Awarded Early Adopter badge`);
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

async function awardBrandBadges() {
  console.log('\n🏅 Checking and awarding brand badges...\n');
  
  try {
    // Get all users with their equipment
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        user_bags (
          bag_equipment (
            equipment (
              brand
            )
          )
        )
      `);
      
    if (usersError || !users) {
      console.error('❌ Could not fetch user equipment');
      return;
    }
    
    // Get all brand badges
    const { data: brandBadges, error: badgesError } = await supabase
      .from('badges')
      .select('id, name')
      .like('name', '% Owner')
      .neq('name', 'Brand Loyalist');
      
    if (badgesError || !brandBadges) {
      console.error('❌ Could not fetch brand badges');
      return;
    }
    
    console.log(`📦 Found ${brandBadges.length} brand badges\n`);
    
    // Process each user
    for (const user of users) {
      const userName = user.display_name || user.username || user.id;
      console.log(`\nProcessing ${userName}...`);
      
      // Get unique brands for this user
      const userBrands = new Set();
      
      if (user.user_bags) {
        for (const bag of user.user_bags) {
          if (bag.bag_equipment) {
            for (const item of bag.bag_equipment) {
              if (item.equipment?.brand) {
                userBrands.add(item.equipment.brand);
              }
            }
          }
        }
      }
      
      if (userBrands.size === 0) {
        console.log(`   No equipment found`);
        continue;
      }
      
      console.log(`   Found equipment from brands: ${Array.from(userBrands).join(', ')}`);
      
      // Award appropriate brand badges
      for (const brand of userBrands) {
        const badgeName = `${brand} Owner`;
        const badge = brandBadges.find(b => b.name === badgeName);
        
        if (badge) {
          const { error } = await supabase
            .from('user_badges')
            .upsert({
              user_id: user.id,
              badge_id: badge.id,
              progress: 100,
              earned_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,badge_id'
            });
            
          if (error) {
            console.log(`   ❌ Error awarding ${badgeName}: ${error.message}`);
          } else {
            console.log(`   ✅ Awarded ${badgeName} badge`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

async function awardAchievementBadges() {
  console.log('\n🏅 Checking achievement badges...\n');
  
  try {
    const { data: users } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        user_bags (
          bag_equipment (
            equipment (
              brand,
              msrp
            )
          )
        )
      `);
      
    for (const user of users) {
      const userName = user.display_name || user.username || user.id;
      console.log(`\nProcessing ${userName}...`);
      
      let equipmentCount = 0;
      let uniqueBrands = new Set();
      let totalValue = 0;
      
      if (user.user_bags) {
        for (const bag of user.user_bags) {
          if (bag.bag_equipment) {
            for (const item of bag.bag_equipment) {
              equipmentCount++;
              if (item.equipment?.brand) {
                uniqueBrands.add(item.equipment.brand);
              }
              if (item.equipment?.msrp) {
                totalValue += item.equipment.msrp;
              }
            }
          }
        }
      }
      
      console.log(`   Equipment: ${equipmentCount} items, ${uniqueBrands.size} brands, $${totalValue} value`);
      
      // Check Starter Set (7+ items)
      if (equipmentCount >= 7) {
        await awardBadgeByName(user.id, 'Starter Set');
      }
      
      // Check Full Bag (14+ items)
      if (equipmentCount >= 14) {
        await awardBadgeByName(user.id, 'Full Bag');
      }
      
      // Check Brand Curious (3+ brands)
      if (uniqueBrands.size >= 3) {
        await awardBadgeByName(user.id, 'Brand Curious');
      }
      
      // Check Brand Enthusiast (5+ brands)
      if (uniqueBrands.size >= 5) {
        await awardBadgeByName(user.id, 'Brand Enthusiast');
      }
      
      // Check Brand Connoisseur (10+ brands)
      if (uniqueBrands.size >= 10) {
        await awardBadgeByName(user.id, 'Brand Connoisseur');
      }
      
      // Check Premium Collection ($5000+ value)
      if (totalValue >= 5000) {
        await awardBadgeByName(user.id, 'Premium Collection');
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

async function awardBadgeByName(userId, badgeName) {
  const { data: badge } = await supabase
    .from('badges')
    .select('id')
    .eq('name', badgeName)
    .single();
    
  if (badge) {
    const { error } = await supabase
      .from('user_badges')
      .upsert({
        user_id: userId,
        badge_id: badge.id,
        progress: 100,
        earned_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,badge_id'
      });
      
    if (!error) {
      console.log(`   ✅ Awarded ${badgeName} badge`);
    }
  }
}

// Main execution
async function main() {
  console.log('🏅 Direct Badge Award Tool');
  console.log('=========================');
  
  await awardEarlyAdopterBadges();
  await awardBrandBadges();
  await awardAchievementBadges();
  
  console.log('\n✨ Done!\n');
}

main();