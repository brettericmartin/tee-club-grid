import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupShaftCompatibility() {
  console.log('\n🏌️ Setting Up Shaft Compatibility System\n');
  console.log('======================================\n');

  try {
    // 1. First, let's check current shaft data
    console.log('1. Checking current shaft categories...\n');
    
    const { data: shafts, error } = await supabase
      .from('shafts')
      .select('id, brand, model, category')
      .order('category');

    if (error) {
      console.error('Error fetching shafts:', error);
      return;
    }

    // Group by category to see what we have
    const categoryGroups = {};
    shafts.forEach(shaft => {
      if (!categoryGroups[shaft.category]) {
        categoryGroups[shaft.category] = 0;
      }
      categoryGroups[shaft.category]++;
    });

    console.log('Current shaft distribution:');
    Object.entries(categoryGroups).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} shafts`);
    });

    // 2. Create compatibility mapping
    console.log('\n2. Setting up shaft compatibility rules...\n');
    
    // Define which shafts work with which clubs
    const compatibilityRules = {
      'driver': ['driver', 'wood', 'fairway_wood'], // Driver shafts can work in fairway woods
      'fairway_wood': ['driver', 'wood', 'fairway_wood', 'hybrid'], // Fairway shafts are versatile
      'wood': ['driver', 'wood', 'fairway_wood', 'hybrid'],
      'hybrid': ['hybrid', 'fairway_wood', 'utility_iron'],
      'utility_iron': ['utility_iron', 'hybrid'],
      'iron': ['iron', 'irons'],
      'irons': ['iron', 'irons'],
      'wedge': ['wedge', 'wedges'],
      'wedges': ['wedge', 'wedges'],
      'putter': ['putter', 'putters'],
      'putters': ['putter', 'putters']
    };

    // 3. Update shaft categories to be more flexible
    console.log('3. Creating default shafts for categories without them...\n');
    
    // Check which categories need default shafts
    const equipmentCategories = ['driver', 'fairway_wood', 'hybrid', 'utility_iron', 'iron', 'wedge', 'putter'];
    
    for (const category of equipmentCategories) {
      const { count } = await supabase
        .from('shafts')
        .select('*', { count: 'exact', head: true })
        .or(`category.eq.${category},category.eq.${category}s`);
      
      if (count === 0) {
        console.log(`Creating default shaft for ${category}...`);
        
        // Create a default shaft
        const defaultShaftData = {
          brand: 'Stock',
          model: `${category.charAt(0).toUpperCase() + category.slice(1)} Shaft`,
          flex: 'Regular',
          weight_grams: category === 'putter' ? 120 : category === 'driver' ? 60 : 70,
          category: category,
          is_stock: true,
          launch_profile: 'mid',
          spin_profile: 'mid'
        };
        
        const { error: insertError } = await supabase
          .from('shafts')
          .insert(defaultShaftData);
        
        if (insertError) {
          console.error(`Error creating default shaft for ${category}:`, insertError.message);
        } else {
          console.log(`✅ Created default shaft for ${category}`);
        }
      }
    }

    // 4. Create default grips if needed
    console.log('\n4. Checking for default grips...\n');
    
    const { count: gripCount } = await supabase
      .from('grips')
      .select('*', { count: 'exact', head: true })
      .eq('is_stock', true);
    
    if (gripCount === 0) {
      console.log('Creating default grip...');
      
      const defaultGripData = {
        brand: 'Stock',
        model: 'Standard Grip',
        size: 'standard',
        weight_grams: 50,
        material: 'rubber',
        is_stock: true
      };
      
      const { error: gripError } = await supabase
        .from('grips')
        .insert(defaultGripData);
      
      if (gripError) {
        console.error('Error creating default grip:', gripError.message);
      } else {
        console.log('✅ Created default grip');
      }
    }

    // 5. Verify final state
    console.log('\n5. Verifying shaft availability...\n');
    
    for (const category of equipmentCategories) {
      const { count } = await supabase
        .from('shafts')
        .select('*', { count: 'exact', head: true })
        .or(`category.eq.${category},category.eq.${category}s`);
      
      console.log(`  ${category}: ${count} shafts available`);
    }

    console.log('\n======================================');
    console.log('✅ Shaft compatibility system ready!');
    console.log('\nNote: The equipment selector needs to be updated to use flexible shaft matching.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupShaftCompatibility().catch(console.error);