import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function generateTopTeedEquipment() {
  console.log('📸 Finding Equipment from Most-Teed Photos\n');

  try {
    // Get the top teed photos with their equipment info
    const { data: topPhotos, error } = await supabase
      .from('equipment_photos')
      .select(`
        id,
        photo_url,
        likes_count,
        equipment_id,
        equipment:equipment_id (
          id,
          brand,
          model,
          category,
          image_url,
          msrp,
          release_year,
          popularity_score
        )
      `)
      .gt('likes_count', 0) // Only photos with at least 1 tee
      .not('equipment_id', 'is', null) // Must have equipment
      .order('likes_count', { ascending: false })
      .limit(100); // Get top 100 photos

    if (error) throw error;

    // Group by equipment and sum tees
    const equipmentMap = new Map();
    
    topPhotos?.forEach(photo => {
      if (photo.equipment) {
        const equipmentId = photo.equipment.id;
        
        if (!equipmentMap.has(equipmentId)) {
          equipmentMap.set(equipmentId, {
            ...photo.equipment,
            totalTees: 0,
            photoCount: 0,
            topPhotoUrl: photo.photo_url,
            topPhotoTees: photo.likes_count
          });
        }
        
        const equipment = equipmentMap.get(equipmentId);
        equipment.totalTees += photo.likes_count || 0;
        equipment.photoCount += 1;
        
        // Keep the most teed photo as the display photo
        if ((photo.likes_count || 0) > equipment.topPhotoTees) {
          equipment.topPhotoUrl = photo.photo_url;
          equipment.topPhotoTees = photo.likes_count;
        }
      }
    });

    // Convert to array and sort by total tees
    const topEquipment = Array.from(equipmentMap.values())
      .sort((a, b) => b.totalTees - a.totalTees)
      .slice(0, 24); // Top 24 for landing page

    console.log('🏆 Top Equipment from Most-Teed Photos:');
    console.log('=========================================\n');

    topEquipment.slice(0, 10).forEach((eq, index) => {
      const badge = index === 0 ? ' 👑' : index < 3 ? ' 🥈' : index < 5 ? ' 🥉' : '';
      console.log(`${(index + 1).toString().padStart(2)}. ${eq.brand} ${eq.model}${badge}`);
      console.log(`    Category: ${eq.category}`);
      console.log(`    Total Tees: ${eq.totalTees}`);
      console.log(`    Photos with Tees: ${eq.photoCount}`);
      console.log(`    Most Teed Photo: ${eq.topPhotoTees} tees`);
      console.log('');
    });

    // Save to a JSON file that the app can use
    const outputPath = join(__dirname, '..', 'src', 'data', 'topTeedEquipment.json');
    const outputData = {
      generated: new Date().toISOString(),
      equipment: topEquipment.map(eq => ({
        id: eq.id,
        brand: eq.brand,
        model: eq.model,
        category: eq.category,
        image_url: eq.topPhotoUrl || eq.image_url, // Use most teed photo
        msrp: eq.msrp,
        release_year: eq.release_year,
        totalTees: eq.totalTees,
        photoCount: eq.photoCount
      }))
    };

    await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n✅ Saved top equipment to: ${outputPath}`);

    // Stats
    const totalTees = topEquipment.reduce((sum, eq) => sum + eq.totalTees, 0);
    const avgTees = (totalTees / topEquipment.length).toFixed(1);

    console.log('\n📊 Summary:');
    console.log('===========');
    console.log(`Equipment items: ${topEquipment.length}`);
    console.log(`Total tees: ${totalTees}`);
    console.log(`Average tees per equipment: ${avgTees}`);
    
    console.log('\n🔄 Next Steps:');
    console.log('1. This data has been saved to src/data/topTeedEquipment.json');
    console.log('2. The GearGrid component will use this data');
    console.log('3. Run this script weekly to update the rankings');
    console.log('4. Consider setting up a cron job or GitHub Action for automation');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

generateTopTeedEquipment();