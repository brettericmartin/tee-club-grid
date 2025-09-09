import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

async function checkMostTeedEquipment() {
  console.log('🏌️ Finding Most Teed Equipment\n');

  try {
    // Get equipment with photo tee counts
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select(`
        id,
        brand,
        model,
        category,
        equipment_photos (
          id,
          likes_count
        )
      `)
      .in('category', ['driver', 'iron', 'wedge', 'putter', 'ball', 'fairway_wood'])
      .limit(200);

    if (error) throw error;

    // Calculate total tees for each equipment
    const equipmentWithTees = equipment.map(eq => {
      const totalTees = eq.equipment_photos?.reduce((sum, photo) => 
        sum + (photo.likes_count || 0), 0) || 0;
      
      return {
        id: eq.id,
        brand: eq.brand,
        model: eq.model,
        category: eq.category,
        photoCount: eq.equipment_photos?.length || 0,
        totalTees
      };
    });

    // Sort by total tees
    equipmentWithTees.sort((a, b) => b.totalTees - a.totalTees);

    console.log('📊 Top 20 Most Teed Equipment:');
    console.log('================================\n');

    const top20 = equipmentWithTees.slice(0, 20);
    
    top20.forEach((eq, index) => {
      const badge = index === 0 ? ' 🏆' : index < 3 ? ' 🥈' : index < 5 ? ' 🥉' : '';
      console.log(`${(index + 1).toString().padStart(2)}. ${eq.brand} ${eq.model}${badge}`);
      console.log(`    Category: ${eq.category}`);
      console.log(`    Total Tees: ${eq.totalTees}`);
      console.log(`    Photos: ${eq.photoCount}`);
      console.log('');
    });

    // Stats by category
    console.log('\n📈 Top Equipment by Category:');
    console.log('==============================\n');

    const categories = ['driver', 'iron', 'wedge', 'putter', 'ball'];
    
    categories.forEach(category => {
      const topInCategory = equipmentWithTees
        .filter(eq => eq.category === category)
        .slice(0, 3);
      
      if (topInCategory.length > 0) {
        console.log(`${category.toUpperCase()}:`);
        topInCategory.forEach((eq, i) => {
          console.log(`  ${i + 1}. ${eq.brand} ${eq.model} (${eq.totalTees} tees)`);
        });
        console.log('');
      }
    });

    // Overall stats
    const totalEquipment = equipmentWithTees.length;
    const equipmentWithTeesCount = equipmentWithTees.filter(eq => eq.totalTees > 0).length;
    const totalTeesSum = equipmentWithTees.reduce((sum, eq) => sum + eq.totalTees, 0);

    console.log('\n📊 Overall Statistics:');
    console.log('=====================');
    console.log(`Total equipment checked: ${totalEquipment}`);
    console.log(`Equipment with tees: ${equipmentWithTeesCount}`);
    console.log(`Total tees across all equipment: ${totalTeesSum}`);
    console.log(`Average tees per equipment: ${(totalTeesSum / totalEquipment).toFixed(1)}`);

    console.log('\n✅ The landing page should now show equipment sorted by actual tee counts!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkMostTeedEquipment();