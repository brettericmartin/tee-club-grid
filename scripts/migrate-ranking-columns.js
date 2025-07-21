import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

async function runMigration() {
  console.log('🔄 Running equipment ranking migration...\n');
  
  try {
    // Check if columns already exist
    console.log('Checking existing columns...');
    const { data: existingData, error: checkError } = await supabase
      .from('equipment')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('Error checking equipment table:', checkError);
      return;
    }
    
    // Since we can't run ALTER TABLE directly through Supabase client,
    // we'll provide instructions
    console.log('\n📋 Migration Instructions:\n');
    console.log('The Supabase client cannot run ALTER TABLE statements directly.');
    console.log('Please run the following migration in your Supabase dashboard:\n');
    console.log('1. Go to https://app.supabase.com/project/[your-project]/sql/new');
    console.log('2. Copy and paste the contents of: scripts/add-equipment-ranking-columns.sql');
    console.log('3. Click "Run" to execute the migration\n');
    console.log('The migration will add these columns to the equipment table:');
    console.log('  - category_rank (INTEGER)');
    console.log('  - total_bag_tees (INTEGER)');
    console.log('  - bags_count (INTEGER)');
    console.log('  - photos_count (INTEGER)');
    console.log('  - ranking_score (FLOAT)');
    console.log('  - last_ranked_at (TIMESTAMP)\n');
    console.log('After running the migration, you can use: npm run rank:equipment');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

runMigration();