import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkEquipmentIssues() {
  console.log('🔍 Checking Equipment Category Issues...\n');
  
  try {
    // First, let's see what categories exist
    const { data: categories, error: catError } = await supabase
      .from('equipment')
      .select('category')
      .order('category');
      
    if (catError) throw catError;
    
    const uniqueCategories = [...new Set(categories.map(item => item.category))];
    console.log('📊 Current categories in database:');
    
    for (const cat of uniqueCategories) {
      const { count } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('category', cat);
      console.log(`  ${cat}: ${count} items`);
    }
    
    // Check specifically for TP5
    console.log('\n🏐 Checking for TP5...');
    const { data: tp5Data, error: tp5Error } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .or('model.ilike.%TP5%,model.ilike.%tp5%');
      
    if (tp5Error) {
      console.error('Error searching for TP5:', tp5Error.message);
    } else if (tp5Data.length === 0) {
      console.log('❌ TP5 not found in database');
    } else {
      console.log('✅ TP5 found:');
      tp5Data.forEach(item => {
        console.log(`  ${item.brand} ${item.model} (${item.category}) - ID: ${item.id}`);
      });
    }
    
    // Check all TaylorMade balls
    console.log('\n🏐 All TaylorMade balls:');
    const { data: tmBalls } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .eq('brand', 'TaylorMade')
      .in('category', ['ball', 'balls', 'golf_ball']);
      
    if (tmBalls && tmBalls.length > 0) {
      tmBalls.forEach(item => {
        console.log(`  ${item.brand} ${item.model} (${item.category}) - ID: ${item.id}`);
      });
    } else {
      console.log('  None found with ball categories');
    }
    
    // Check what categories contain golf balls
    console.log('\n🔍 Categories that might contain balls:');
    const ballCategories = ['ball', 'balls', 'golf_ball', 'golf_balls'];
    for (const cat of ballCategories) {
      const { count } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('category', cat);
      if (count > 0) {
        console.log(`  ${cat}: ${count} items`);
        
        // Show a few examples
        const { data: examples } = await supabase
          .from('equipment')
          .select('brand, model')
          .eq('category', cat)
          .limit(3);
        examples?.forEach(item => {
          console.log(`    - ${item.brand} ${item.model}`);
        });
      }
    }
    
    // Check rangefinder category
    console.log('\n📡 Checking rangefinder equipment:');
    const { data: rangefinders } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .eq('category', 'rangefinder');
      
    if (rangefinders && rangefinders.length > 0) {
      console.log(`Found ${rangefinders.length} rangefinders:`);
      rangefinders.forEach(item => {
        console.log(`  ${item.brand} ${item.model} - ID: ${item.id}`);
      });
    } else {
      console.log('No rangefinders found in database');
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

checkEquipmentIssues().catch(console.error);