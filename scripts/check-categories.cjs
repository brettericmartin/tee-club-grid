require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkCategories() {
  console.log('Checking equipment categories in database...\n');
  
  const { data, error } = await supabase
    .from('equipment')
    .select('category')
    .neq('category', null);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Group by category
  const categories = {};
  for (const item of data) {
    if (!categories[item.category]) {
      categories[item.category] = 0;
    }
    categories[item.category]++;
  }
  
  console.log('Categories in database:');
  Object.entries(categories).sort().forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} items`);
  });
  
  console.log('\nLooking for inconsistencies...');
  
  // Check for variations of common categories
  const ballCategories = Object.keys(categories).filter(cat => 
    cat.includes('ball') || cat.includes('golf_ball')
  );
  
  const woodCategories = Object.keys(categories).filter(cat => 
    cat.includes('wood') || cat.includes('fairway')
  );
  
  if (ballCategories.length > 1) {
    console.log('Ball category variations:', ballCategories);
  }
  
  if (woodCategories.length > 1) {
    console.log('Wood category variations:', woodCategories);
  }
}

checkCategories().catch(console.error);