import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function cleanupPrimaryBags() {
  console.log('=== Cleaning Up Multiple Primary Bags ===\n');
  
  try {
    // Get all bags grouped by user
    const { data: allBags } = await supabase
      .from('user_bags')
      .select('id, user_id, name, is_primary, created_at')
      .eq('is_primary', true)
      .order('created_at', { ascending: true });
      
    if (!allBags || allBags.length === 0) {
      console.log('No primary bags found.');
      return;
    }
    
    // Group by user
    const userBags = {};
    allBags.forEach(bag => {
      if (!userBags[bag.user_id]) {
        userBags[bag.user_id] = [];
      }
      userBags[bag.user_id].push(bag);
    });
    
    // Fix users with multiple primary bags
    let fixedCount = 0;
    for (const [userId, bags] of Object.entries(userBags)) {
      if (bags.length > 1) {
        console.log(`\nUser ${userId} has ${bags.length} primary bags:`);
        bags.forEach(bag => console.log(`  - ${bag.name}`));
        
        console.log(`Keeping only "${bags[0].name}" as primary...`);
        
        // Keep only the first one as primary
        for (let i = 1; i < bags.length; i++) {
          const { error } = await supabase
            .from('user_bags')
            .update({ is_primary: false })
            .eq('id', bags[i].id);
            
          if (error) {
            console.error(`Failed to unset primary for ${bags[i].name}:`, error);
          } else {
            console.log(`  ✅ Unset primary for ${bags[i].name}`);
            fixedCount++;
          }
        }
      }
    }
    
    if (fixedCount > 0) {
      console.log(`\n✅ Fixed ${fixedCount} bags that were incorrectly marked as primary.`);
    } else {
      console.log('\n✅ No issues found - each user has only one primary bag.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

cleanupPrimaryBags().catch(console.error);