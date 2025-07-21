import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function rankEquipment() {
  console.log('Starting equipment ranking process...');
  
  try {
    // Step 1: Get all equipment with their stats
    console.log('Step 1: Fetching equipment data...');
    
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select(`
        id,
        category,
        brand,
        model,
        equipment_photos(id),
        bag_equipment(
          bag_id,
          user_bags!inner(
            likes_count
          )
        )
      `);
    
    if (error) {
      console.error('Error fetching equipment:', error);
      return;
    }
    
    console.log(`Found ${equipment.length} equipment items`);
    
    // Step 2: Calculate stats for each equipment
    console.log('Step 2: Calculating statistics...');
    
    const equipmentStats = equipment.map(item => {
      // Count photos
      const photosCount = item.equipment_photos?.length || 0;
      
      // Calculate bag stats
      const uniqueBags = new Set();
      let totalTees = 0;
      
      item.bag_equipment?.forEach(be => {
        if (be.user_bags && be.bag_id) {
          uniqueBags.add(be.bag_id);
          totalTees += be.user_bags.likes_count || 0;
        }
      });
      
      const bagsCount = uniqueBags.size;
      
      // Calculate ranking score (only if has photos)
      const rankingScore = photosCount > 0 ? 
        (totalTees * 10000) + 
        (photosCount * 100) + 
        (bagsCount * 10) + 
        Math.random()
        : -1;
      
      return {
        id: item.id,
        category: item.category,
        brand: item.brand,
        model: item.model,
        photos_count: photosCount,
        bags_count: bagsCount,
        total_bag_tees: totalTees,
        ranking_score: rankingScore,
        has_photos: photosCount > 0
      };
    });
    
    // Step 3: Group by category and rank
    console.log('Step 3: Ranking within categories...');
    
    const categories = [...new Set(equipment.map(e => e.category))];
    const updates = [];
    
    categories.forEach(category => {
      // Get equipment in this category with photos, sorted by score
      const categoryEquipment = equipmentStats
        .filter(e => e.category === category && e.has_photos)
        .sort((a, b) => b.ranking_score - a.ranking_score);
      
      // Assign ranks
      categoryEquipment.forEach((item, index) => {
        updates.push({
          ...item,
          category_rank: index + 1
        });
      });
      
      console.log(`  ${category}: Ranked ${categoryEquipment.length} items`);
    });
    
    // Step 4: Update database
    console.log('Step 4: Updating database...');
    
    // Update each equipment item
    let successCount = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('equipment')
        .update({
          category_rank: update.category_rank,
          total_bag_tees: update.total_bag_tees,
          bags_count: update.bags_count,
          photos_count: update.photos_count,
          ranking_score: update.ranking_score,
          last_ranked_at: new Date().toISOString()
        })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`Error updating ${update.brand} ${update.model}:`, updateError);
      } else {
        successCount++;
      }
    }
    
    // Clear ranks for equipment without photos
    const { error: clearError } = await supabase
      .from('equipment')
      .update({ category_rank: null })
      .eq('photos_count', 0);
    
    if (clearError) {
      console.error('Error clearing ranks for items without photos:', clearError);
    }
    
    console.log('\n✅ Ranking complete!');
    console.log(`   Successfully updated: ${successCount} items`);
    console.log(`   Categories processed: ${categories.length}`);
    
    // Show top 3 in each category
    console.log('\n📊 Top 3 in each category:');
    categories.forEach(category => {
      const top3 = updates
        .filter(e => e.category === category)
        .slice(0, 3);
      
      if (top3.length > 0) {
        console.log(`\n  ${category}:`);
        top3.forEach(item => {
          console.log(`    ${item.category_rank}. ${item.brand} ${item.model} (${item.total_bag_tees} tees, ${item.photos_count} photos)`);
        });
      }
    });
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the ranking
rankEquipment().then(() => {
  console.log('\nDone!');
  process.exit(0);
});