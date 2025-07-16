// import './supabase-admin.js'; // Removed due to CommonJS/ESM conflict
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  limit: null,
  userId: null,
  category: null,
  verbose: args.includes('--verbose'),
};

// Parse limit
const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  options.limit = parseInt(args[limitIndex + 1]);
}

// Parse user ID
const userIndex = args.indexOf('--user');
if (userIndex !== -1 && args[userIndex + 1]) {
  options.userId = args[userIndex + 1];
}

// Parse category
const categoryIndex = args.indexOf('--category');
if (categoryIndex !== -1 && args[categoryIndex + 1]) {
  options.category = args[categoryIndex + 1];
}

console.log('🏅 Retroactive Badge Check Tool');
console.log('================================');
console.log('Options:', options);
console.log('');

async function checkSingleUser(userId) {
  console.log(`\n👤 Checking badges for user: ${userId}`);
  
  try {
    // Get user info
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', userId)
      .single();
      
    if (profile) {
      console.log(`   Name: ${profile.display_name || profile.username || 'Unknown'}`);
    }
    
    // Check and award badges
    if (!options.dryRun) {
      const { data: results, error } = await supabase.rpc('check_and_award_badges', {
        p_user_id: userId
      });
      
      if (error) {
        console.error(`   ❌ Error checking badges:`, error.message);
        return { error: 1, awarded: 0, updated: 0 };
      }
      
      const newBadges = results?.filter(r => r.newly_earned) || [];
      const updatedBadges = results?.filter(r => !r.newly_earned) || [];
      
      if (newBadges.length > 0) {
        console.log(`   🎉 Newly awarded badges:`);
        newBadges.forEach(badge => {
          console.log(`      - ${badge.badge_name}`);
        });
      }
      
      if (updatedBadges.length > 0 && options.verbose) {
        console.log(`   📊 Updated progress for:`);
        updatedBadges.forEach(badge => {
          console.log(`      - ${badge.badge_name}`);
        });
      }
      
      return { error: 0, awarded: newBadges.length, updated: updatedBadges.length };
    } else {
      // Dry run - just check what badges would be awarded
      console.log(`   🔍 Dry run - checking eligibility...`);
      
      // Get current badges
      const { data: currentBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId)
        .eq('progress', 100);
        
      const earnedBadgeIds = new Set(currentBadges?.map(b => b.badge_id) || []);
      
      // Get all badges and check eligibility
      const { data: allBadges } = await supabase
        .from('badges')
        .select(`
          *,
          badge_criteria (*)
        `)
        .eq('is_active', true);
        
      let potentialNew = 0;
      
      for (const badge of allBadges || []) {
        if (!earnedBadgeIds.has(badge.id)) {
          // This is a badge they don't have - check if they qualify
          // In a real implementation, we'd check the specific criteria
          // For now, we'll just indicate it needs checking
          if (options.verbose) {
            console.log(`      - Would check: ${badge.name}`);
          }
          potentialNew++;
        }
      }
      
      console.log(`   📋 Potential new badges to check: ${potentialNew}`);
      return { error: 0, awarded: 0, updated: 0 };
    }
    
  } catch (error) {
    console.error(`   ❌ Unexpected error:`, error.message);
    return { error: 1, awarded: 0, updated: 0 };
  }
}

async function checkAllUsers() {
  console.log('\n🚀 Starting batch badge check...\n');
  
  // Get total user count
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
    
  console.log(`📊 Total users to process: ${totalUsers}`);
  
  if (options.limit) {
    console.log(`📉 Limited to: ${options.limit} users`);
  }
  
  // Process users in batches
  const batchSize = 100;
  let offset = 0;
  let processedCount = 0;
  let totalAwarded = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  
  const startTime = Date.now();
  
  while (true) {
    // Get batch of users
    const query = supabase
      .from('profiles')
      .select('id, username, display_name')
      .order('created_at')
      .range(offset, offset + batchSize - 1);
      
    if (options.limit && offset >= options.limit) {
      break;
    }
    
    const { data: users, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching users:', error.message);
      break;
    }
    
    if (!users || users.length === 0) {
      break;
    }
    
    console.log(`\n📦 Processing batch ${Math.floor(offset / batchSize) + 1} (${users.length} users)...`);
    
    // Process each user in the batch
    for (const user of users) {
      if (options.limit && processedCount >= options.limit) {
        break;
      }
      
      const result = await checkSingleUser(user.id);
      totalAwarded += result.awarded;
      totalUpdated += result.updated;
      totalErrors += result.error;
      processedCount++;
      
      // Progress indicator
      if (processedCount % 10 === 0) {
        const progress = ((processedCount / (options.limit || totalUsers)) * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${progress}% (${processedCount}/${options.limit || totalUsers})`);
      }
    }
    
    offset += batchSize;
    
    if (options.limit && processedCount >= options.limit) {
      break;
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n\n✅ Batch processing complete!\n');
  console.log('📊 Summary:');
  console.log(`   - Users processed: ${processedCount}`);
  console.log(`   - Badges awarded: ${totalAwarded}`);
  console.log(`   - Progress updated: ${totalUpdated}`);
  console.log(`   - Errors: ${totalErrors}`);
  console.log(`   - Duration: ${duration} seconds`);
  console.log(`   - Rate: ${(processedCount / parseFloat(duration)).toFixed(2)} users/second`);
}

// Main execution
async function main() {
  try {
    if (options.userId) {
      // Single user mode
      await checkSingleUser(options.userId);
    } else {
      // Batch mode
      await checkAllUsers();
    }
    
    console.log('\n✨ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Show usage if --help
if (args.includes('--help')) {
  console.log(`
Usage: node retroactive-badge-check.js [options]

Options:
  --dry-run          Preview what would happen without making changes
  --limit <n>        Process only the first n users
  --user <id>        Process a single user by ID
  --category <cat>   Process only badges in a specific category
  --verbose          Show detailed progress information
  --help             Show this help message

Examples:
  # Check all users (live run)
  node retroactive-badge-check.js

  # Dry run for first 10 users
  node retroactive-badge-check.js --dry-run --limit 10

  # Check specific user
  node retroactive-badge-check.js --user abc123-def456

  # Verbose dry run
  node retroactive-badge-check.js --dry-run --verbose --limit 5
`);
  process.exit(0);
}

// Run the script
main();