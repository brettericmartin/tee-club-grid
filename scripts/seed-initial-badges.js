import { createAdminClient } from './supabase-admin.js';

const supabase = createAdminClient();

async function seedInitialBadges() {
  console.log('Seeding initial badges...');

  try {
    // Get categories first
    const { data: categories, error: catError } = await supabase
      .from('badge_categories')
      .select('id, name');
    
    if (catError) throw catError;

    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });

    // Define initial badges
    const badges = [
      // Early Bird Badges
      {
        name: 'early_bird_100',
        display_name: 'Early Bird',
        description: 'One of the first 100 members of Teed.club',
        category_id: categoryMap.early_bird,
        icon_name: 'sunrise',
        icon_color: '#F59E0B',
        rarity: 'epic',
        criteria: { type: 'user_count', max_users: 100 }
      },
      {
        name: 'founding_member',
        display_name: 'Founding Member',
        description: 'One of the first 1000 members',
        category_id: categoryMap.early_bird,
        icon_name: 'flag',
        icon_color: '#8B5CF6',
        rarity: 'rare',
        criteria: { type: 'user_count', max_users: 1000 }
      },

      // Photo Master Badges
      {
        name: 'photo_pioneer',
        display_name: 'Photo Pioneer',
        description: 'Uploaded your first equipment photo',
        category_id: categoryMap.photo_master,
        icon_name: 'camera',
        icon_color: '#10B981',
        rarity: 'common',
        tier: 1,
        criteria: { type: 'photo_count', threshold: 1 }
      },
      {
        name: 'photo_enthusiast',
        display_name: 'Photo Enthusiast',
        description: 'Uploaded 5 equipment photos',
        category_id: categoryMap.photo_master,
        icon_name: 'camera',
        icon_color: '#3B82F6',
        rarity: 'uncommon',
        tier: 2,
        criteria: { type: 'photo_count', threshold: 5 }
      },
      {
        name: 'photo_expert',
        display_name: 'Photo Expert',
        description: 'Uploaded 50 equipment photos',
        category_id: categoryMap.photo_master,
        icon_name: 'camera',
        icon_color: '#8B5CF6',
        rarity: 'rare',
        tier: 3,
        criteria: { type: 'photo_count', threshold: 50 }
      },
      {
        name: 'photo_master',
        display_name: 'Photo Master',
        description: 'Uploaded 100 equipment photos',
        category_id: categoryMap.photo_master,
        icon_name: 'camera',
        icon_color: '#F59E0B',
        rarity: 'epic',
        tier: 4,
        criteria: { type: 'photo_count', threshold: 100 }
      },

      // Equipment Expert Badges
      {
        name: 'equipment_contributor',
        display_name: 'Equipment Contributor',
        description: 'Added your first equipment to the platform',
        category_id: categoryMap.equipment_expert,
        icon_name: 'golf-club',
        icon_color: '#10B981',
        rarity: 'common',
        criteria: { type: 'equipment_count', threshold: 1 }
      },
      {
        name: 'equipment_connoisseur',
        display_name: 'Equipment Connoisseur',
        description: 'Added 5 or more equipment items',
        category_id: categoryMap.equipment_expert,
        icon_name: 'golf-club',
        icon_color: '#3B82F6',
        rarity: 'uncommon',
        criteria: { type: 'equipment_count', threshold: 5 }
      },
      {
        name: 'equipment_guru',
        display_name: 'Equipment Guru',
        description: 'Added 20 or more equipment items',
        category_id: categoryMap.equipment_expert,
        icon_name: 'golf-club',
        icon_color: '#8B5CF6',
        rarity: 'rare',
        criteria: { type: 'equipment_count', threshold: 20 }
      },

      // Brand Specialist Badges
      {
        name: 'taylormade_specialist',
        display_name: 'TaylorMade Specialist',
        description: '3+ TaylorMade items in your bag',
        category_id: categoryMap.brand_specialist,
        icon_name: 'shield',
        icon_color: '#DC2626',
        rarity: 'uncommon',
        criteria: { type: 'brand_equipment', brand: 'TaylorMade', threshold: 3 }
      },
      {
        name: 'callaway_specialist',
        display_name: 'Callaway Specialist',
        description: '3+ Callaway items in your bag',
        category_id: categoryMap.brand_specialist,
        icon_name: 'shield',
        icon_color: '#000000',
        rarity: 'uncommon',
        criteria: { type: 'brand_equipment', brand: 'Callaway', threshold: 3 }
      },
      {
        name: 'titleist_specialist',
        display_name: 'Titleist Specialist',
        description: '3+ Titleist items in your bag',
        category_id: categoryMap.brand_specialist,
        icon_name: 'shield',
        icon_color: '#1F2937',
        rarity: 'uncommon',
        criteria: { type: 'brand_equipment', brand: 'Titleist', threshold: 3 }
      },
      {
        name: 'ping_specialist',
        display_name: 'Ping Specialist',
        description: '3+ Ping items in your bag',
        category_id: categoryMap.brand_specialist,
        icon_name: 'shield',
        icon_color: '#DC2626',
        rarity: 'uncommon',
        criteria: { type: 'brand_equipment', brand: 'Ping', threshold: 3 }
      },

      // Brand Loyalist Badge
      {
        name: 'brand_loyalist',
        display_name: 'Brand Loyalist',
        description: 'Complete bag from a single brand',
        category_id: categoryMap.brand_specialist,
        icon_name: 'crown',
        icon_color: '#F59E0B',
        rarity: 'epic',
        criteria: { type: 'single_brand_bag', min_items: 10 }
      },

      // Community Builder Badges
      {
        name: 'tee_supporter',
        display_name: 'Tee Supporter',
        description: 'Given 10 tees to other members',
        category_id: categoryMap.community_builder,
        icon_name: 'heart',
        icon_color: '#10B981',
        rarity: 'common',
        tier: 1,
        criteria: { type: 'tees_given', threshold: 10 }
      },
      {
        name: 'tee_champion',
        display_name: 'Tee Champion',
        description: 'Given 50 tees to other members',
        category_id: categoryMap.community_builder,
        icon_name: 'heart',
        icon_color: '#3B82F6',
        rarity: 'uncommon',
        tier: 2,
        criteria: { type: 'tees_given', threshold: 50 }
      },
      {
        name: 'tee_legend',
        display_name: 'Tee Legend',
        description: 'Given 100 tees to other members',
        category_id: categoryMap.community_builder,
        icon_name: 'heart',
        icon_color: '#8B5CF6',
        rarity: 'rare',
        tier: 3,
        criteria: { type: 'tees_given', threshold: 100 }
      },

      // Collector Badges
      {
        name: 'value_collector',
        display_name: 'Value Collector',
        description: 'Bag worth over $5,000',
        category_id: categoryMap.collector,
        icon_name: 'dollar',
        icon_color: '#10B981',
        rarity: 'uncommon',
        criteria: { type: 'bag_value', threshold: 5000 }
      },
      {
        name: 'premium_collector',
        display_name: 'Premium Collector',
        description: 'Bag worth over $10,000',
        category_id: categoryMap.collector,
        icon_name: 'dollar',
        icon_color: '#3B82F6',
        rarity: 'rare',
        criteria: { type: 'bag_value', threshold: 10000 }
      },
      {
        name: 'elite_collector',
        display_name: 'Elite Collector',
        description: 'Bag worth over $20,000',
        category_id: categoryMap.collector,
        icon_name: 'dollar',
        icon_color: '#F59E0B',
        rarity: 'epic',
        criteria: { type: 'bag_value', threshold: 20000 }
      }
    ];

    // Insert badges
    console.log(`Inserting ${badges.length} badges...`);
    const { error: insertError } = await supabase
      .from('badges')
      .insert(badges);

    if (insertError) throw insertError;

    console.log('✅ Initial badges seeded successfully!');

    // Show summary
    const { data: badgeCount } = await supabase
      .from('badges')
      .select('category_id, rarity', { count: 'exact' });

    console.log('\nBadge Summary:');
    console.log(`Total badges: ${badgeCount.length}`);
    
    const rarityCount = {};
    badgeCount.forEach(badge => {
      rarityCount[badge.rarity] = (rarityCount[badge.rarity] || 0) + 1;
    });
    
    console.log('\nBy Rarity:');
    Object.entries(rarityCount).forEach(([rarity, count]) => {
      console.log(`  ${rarity}: ${count}`);
    });

  } catch (error) {
    console.error('Error seeding badges:', error);
    throw error;
  }
}

// Run the script
seedInitialBadges()
  .then(() => {
    console.log('\n✅ Badge seeding completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to seed badges:', error);
    process.exit(1);
  });