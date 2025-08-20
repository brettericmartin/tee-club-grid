import { supabase } from './supabase-admin.js';

async function checkBadgesTables() {
  console.log('Checking badge-related tables...\n');
  
  const tables = [
    'badges',
    'badge_categories', 
    'badge_criteria',
    'user_badges',
    'badge_notifications'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: Table does not exist or error accessing`);
      } else {
        console.log(`✅ ${table}: Exists (${count} rows)`);
      }
    } catch (e) {
      console.log(`❌ ${table}: Error - ${e.message}`);
    }
  }
  
  process.exit();
}

checkBadgesTables();
