import { supabase } from './supabase-admin.js';

async function checkBadgeSchema() {
  console.log('Checking badges table schema...\n');
  
  // Fetch a sample badge to see the structure
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching badge:', error);
  } else if (data && data.length > 0) {
    console.log('Sample badge structure:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('\nAvailable columns:');
    console.log(Object.keys(data[0]).join(', '));
  } else {
    console.log('No badges found in table');
  }
  
  process.exit();
}

checkBadgeSchema();
