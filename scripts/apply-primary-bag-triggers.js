import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Need service key for DDL operations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY is required to apply triggers');
  console.error('Please add it to your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyPrimaryBagTriggers() {
  console.log('=== Applying Primary Bag Triggers ===\n');
  
  try {
    // Read the SQL file
    const sqlPath = join(__dirname, '..', 'sql', 'add-primary-bag-support-fixed.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    console.log('Reading SQL file:', sqlPath);
    console.log('SQL content length:', sqlContent.length, 'characters\n');
    
    // First, let's fix the current data - remove multiple primary bags
    console.log('1. Fixing existing data - ensuring only one primary bag per user...');
    
    // Get all users with multiple primary bags
    const { data: allPrimaryBags } = await supabase
      .from('user_bags')
      .select('id, user_id, name, created_at')
      .eq('is_primary', true)
      .order('created_at', { ascending: true });
      
    // Group by user
    const userBags = {};
    allPrimaryBags?.forEach(bag => {
      if (!userBags[bag.user_id]) {
        userBags[bag.user_id] = [];
      }
      userBags[bag.user_id].push(bag);
    });
    
    // Fix users with multiple primary bags
    for (const [userId, bags] of Object.entries(userBags)) {
      if (bags.length > 1) {
        console.log(`\nUser ${userId} has ${bags.length} primary bags`);
        console.log('Keeping primary:', bags[0].name);
        
        // Keep only the first one as primary
        for (let i = 1; i < bags.length; i++) {
          console.log('Unsetting primary for:', bags[i].name);
          await supabase
            .from('user_bags')
            .update({ is_primary: false })
            .eq('id', bags[i].id);
        }
      }
    }
    
    console.log('\n2. Applying triggers from SQL file...');
    
    // Execute the SQL content
    // Note: Supabase doesn't have a direct SQL execution endpoint in the JS client
    // We need to use the SQL editor in the Supabase dashboard or the CLI
    
    console.log('\n⚠️  IMPORTANT: Triggers cannot be applied via the JS client.');
    console.log('You need to run the SQL file in one of these ways:\n');
    console.log('Option 1: Supabase Dashboard');
    console.log('  1. Go to your Supabase project dashboard');
    console.log('  2. Navigate to SQL Editor');
    console.log('  3. Copy and paste the content from:');
    console.log('     sql/add-primary-bag-support-fixed.sql');
    console.log('  4. Click "Run"\n');
    
    console.log('Option 2: Supabase CLI');
    console.log('  1. Install Supabase CLI if not already installed');
    console.log('  2. Run: supabase db push < sql/add-primary-bag-support-fixed.sql\n');
    
    console.log('After applying the triggers, run the check script again:');
    console.log('  node scripts/check-primary-bag-triggers.js');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

applyPrimaryBagTriggers().catch(console.error);