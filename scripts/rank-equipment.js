import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function rankEquipment() {
  console.log('Starting equipment ranking process...');
  
  try {
    // Step 1: Update photo counts for all equipment
    console.log('Step 1: Updating photo counts...');
    const { error: photoCountError } = await supabase.rpc('update_equipment_photo_counts');
    if (photoCountError) {
      console.error('Error updating photo counts:', photoCountError);
      // Continue anyway, use existing counts
    }
    
    // Step 2: Update bag usage statistics
    console.log('Step 2: Calculating bag usage statistics...');
    const { data: bagStats, error: bagStatsError } = await supabase
      .from('equipment')
      .select(`
        id,
        category,
        bag_equipment!inner(
          bag_id,
          user_bags!inner(
            tees_count
          )
        )
      `);
    
    if (bagStatsError) {
      console.error('Error fetching bag stats:', bagStatsError);
      return;
    }
    
    // Process bag stats to calculate totals per equipment
    const equipmentStats = {};
    
    bagStats?.forEach(equipment => {
      if (!equipmentStats[equipment.id]) {
        equipmentStats[equipment.id] = {
          id: equipment.id,
          category: equipment.category,
          bags_count: 0,
          total_bag_tees: 0,
          unique_bags: new Set()
        };
      }
      
      equipment.bag_equipment?.forEach(be => {
        const bagId = be.bag_id;
        const teesCount = be.user_bags?.tees_count || 0;
        
        if (!equipmentStats[equipment.id].unique_bags.has(bagId)) {
          equipmentStats[equipment.id].unique_bags.add(bagId);
          equipmentStats[equipment.id].bags_count++;
          equipmentStats[equipment.id].total_bag_tees += teesCount;
        }
      });
    });
    
    // Step 3: Get all equipment with photo counts
    console.log('Step 3: Fetching equipment with photo counts...');
    const { data: allEquipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, category, photos_count');
    
    if (equipmentError) {
      console.error('Error fetching equipment:', equipmentError);
      return;
    }
    
    // Step 4: Calculate ranking scores
    console.log('Step 4: Calculating ranking scores...');
    const equipmentWithScores = allEquipment.map(equipment => {
      const stats = equipmentStats[equipment.id] || {
        bags_count: 0,
        total_bag_tees: 0
      };
      
      // Only rank equipment that has photos
      const hasPhotos = equipment.photos_count > 0;
      
      // Calculate composite score
      const rankingScore = hasPhotos ? 
        (stats.total_bag_tees * 10000) + 
        (equipment.photos_count * 100) + 
        (stats.bags_count * 10) + 
        (Math.random()) // Random 0-1 for tie breaking
        : -1; // Negative score for equipment without photos
      
      return {
        id: equipment.id,
        category: equipment.category,
        photos_count: equipment.photos_count || 0,
        bags_count: stats.bags_count,
        total_bag_tees: stats.total_bag_tees,
        ranking_score: rankingScore,
        has_photos: hasPhotos
      };
    });
    
    // Step 5: Rank within each category
    console.log('Step 5: Ranking within categories...');
    const categories = [...new Set(allEquipment.map(e => e.category))];
    const updates = [];
    
    categories.forEach(category => {
      // Get equipment in this category that has photos
      const categoryEquipment = equipmentWithScores
        .filter(e => e.category === category && e.has_photos)
        .sort((a, b) => b.ranking_score - a.ranking_score);
      
      // Assign ranks
      categoryEquipment.forEach((equipment, index) => {
        updates.push({
          id: equipment.id,
          category_rank: index + 1,
          total_bag_tees: equipment.total_bag_tees,
          bags_count: equipment.bags_count,
          photos_count: equipment.photos_count,
          ranking_score: equipment.ranking_score,
          last_ranked_at: new Date().toISOString()
        });
      });
      
      console.log(`  ${category}: Ranked ${categoryEquipment.length} items with photos`);
    });
    
    // Step 6: Update database with new rankings
    console.log('Step 6: Updating database with rankings...');
    
    // First, clear existing ranks
    const { error: clearError } = await supabase
      .from('equipment')
      .update({ category_rank: null })
      .not('id', 'is', null);
    
    if (clearError) {
      console.error('Error clearing ranks:', clearError);
      return;
    }
    
    // Update in batches of 100
    const batchSize = 100;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('equipment')
          .update({
            category_rank: update.category_rank,
            total_bag_tees: update.total_bag_tees,
            bags_count: update.bags_count,
            photos_count: update.photos_count,
            ranking_score: update.ranking_score,
            last_ranked_at: update.last_ranked_at
          })
          .eq('id', update.id);
        
        if (updateError) {
          console.error(`Error updating equipment ${update.id}:`, updateError);
        }
      }
      
      console.log(`  Updated ${Math.min(i + batchSize, updates.length)} of ${updates.length} items`);
    }
    
    console.log('✅ Ranking complete!');
    console.log(`   Total equipment ranked: ${updates.length}`);
    console.log(`   Categories processed: ${categories.length}`);
    
  } catch (error) {
    console.error('Fatal error during ranking:', error);
    process.exit(1);
  }
}

// Create the stored procedure if it doesn't exist
async function createStoredProcedure() {
  const sql = `
    CREATE OR REPLACE FUNCTION update_equipment_photo_counts()
    RETURNS void AS $$
    BEGIN
      UPDATE equipment e
      SET photos_count = (
        SELECT COUNT(*)
        FROM equipment_photos ep
        WHERE ep.equipment_id = e.id
      );
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error && !error.message.includes('already exists')) {
    console.error('Error creating stored procedure:', error);
  }
}

// Run the ranking
createStoredProcedure().then(() => {
  rankEquipment().then(() => {
    console.log('Done!');
    process.exit(0);
  });
});