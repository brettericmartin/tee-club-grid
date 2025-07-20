import { supabase } from './supabase-admin.js';

async function getLandingPageStats() {
  try {
    console.log('Fetching landing page statistics...\n');

    // 1. Total number of bags
    const { count: bagCount, error: bagError } = await supabase
      .from('user_bags')
      .select('*', { count: 'exact', head: true });
    
    if (bagError) throw bagError;
    console.log(`📊 Total Bags: ${bagCount || 0}`);

    // 2. Total number of equipment items
    const { count: equipmentCount, error: equipmentError } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true });
    
    if (equipmentError) throw equipmentError;
    console.log(`🏌️ Total Equipment Items: ${equipmentCount || 0}`);

    // 3. Total number of users/profiles
    const { count: profileCount, error: profileError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (profileError) throw profileError;
    console.log(`👥 Total Users: ${profileCount || 0}`);

    // 4. Most liked/teed bags (top 3)
    console.log('\n🏆 Top 3 Most Teed Bags:');
    
    // First get all bags with their like counts
    const { data: allBags, error: allBagsError } = await supabase
      .from('user_bags')
      .select(`
        id,
        name,
        profiles!inner(username)
      `);
    
    if (allBagsError) throw allBagsError;
    
    // Get like counts for each bag
    const bagsWithCounts = await Promise.all(
      allBags.map(async (bag) => {
        const { count, error } = await supabase
          .from('bag_likes')
          .select('*', { count: 'exact', head: true })
          .eq('bag_id', bag.id);
        
        return {
          ...bag,
          tee_count: error ? 0 : (count || 0)
        };
      })
    );
    
    // Sort by tee count and get top 3
    const topBags = bagsWithCounts
      .sort((a, b) => b.tee_count - a.tee_count)
      .slice(0, 3);
    
    if (topBags.length > 0 && topBags[0].tee_count > 0) {
      topBags.forEach((bag, index) => {
        console.log(`  ${index + 1}. "${bag.name}" by @${bag.profiles.username} - ${bag.tee_count} tees`);
      });
    } else {
      console.log('  No bags with tees yet');
    }

    // 5. Most popular equipment items by category
    console.log('\n🎯 Most Popular Equipment by Category:');
    
    const categories = ['driver', 'putter', 'irons', 'wedge', 'hybrid'];
    
    for (const category of categories) {
      const { data: popularItem, error: popularError } = await supabase
        .from('equipment')
        .select(`
          id,
          brand,
          model,
          category,
          popularity_score
        `)
        .eq('category', category)
        .order('popularity_score', { ascending: false })
        .limit(1)
        .single();
      
      if (!popularError && popularItem) {
        console.log(`  ${category.charAt(0).toUpperCase() + category.slice(1)}: ${popularItem.brand} ${popularItem.model} (popularity: ${popularItem.popularity_score || 0})`);
      } else if (popularError?.code !== 'PGRST116') { // PGRST116 = no rows found
        console.log(`  ${category.charAt(0).toUpperCase() + category.slice(1)}: No items found`);
      }
    }

    // Additional useful stats
    console.log('\n📈 Additional Statistics:');
    
    // Total photos uploaded
    const { count: photoCount, error: photoError } = await supabase
      .from('equipment_photos')
      .select('*', { count: 'exact', head: true });
    
    if (!photoError) {
      console.log(`  📸 Total Equipment Photos: ${photoCount || 0}`);
    }

    // Total feed posts
    const { count: feedCount, error: feedError } = await supabase
      .from('feed_posts')
      .select('*', { count: 'exact', head: true });
    
    if (!feedError) {
      console.log(`  📝 Total Feed Posts: ${feedCount || 0}`);
    }

    // Users with bags
    const { count: usersWithBags, error: usersWithBagsError } = await supabase
      .from('user_bags')
      .select('user_id', { count: 'exact', head: true })
      .not('user_id', 'is', null);
    
    if (!usersWithBagsError) {
      console.log(`  🎒 Users with Bags: ${usersWithBags || 0}`);
    }

    // Most active brand
    const { data: brandStats, error: brandError } = await supabase
      .from('equipment')
      .select('brand')
      .not('brand', 'is', null);
    
    if (!brandError && brandStats) {
      const brandCounts = {};
      brandStats.forEach(item => {
        brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
      });
      
      const topBrand = Object.entries(brandCounts)
        .sort((a, b) => b[1] - a[1])[0];
      
      if (topBrand) {
        console.log(`  🏭 Most Popular Brand: ${topBrand[0]} (${topBrand[1]} items)`);
      }
    }

    console.log('\n✅ Stats collection complete!');
    
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

getLandingPageStats();