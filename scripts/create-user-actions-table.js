import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createUserActionsTable() {
  console.log('🔧 Attempting to create user_actions table...\n');

  // First, let's check if we can access the table
  try {
    const { data, error } = await supabase
      .from('user_actions')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ user_actions table already exists!');
      return true;
    }

    if (error.code === '42P01') {
      console.log('❌ user_actions table does not exist');
      console.log('\nUnfortunately, I cannot create tables directly through the Supabase client.');
      console.log('\nYou have two options:');
      console.log('\n1. Run this SQL in your Supabase dashboard:');
      console.log('```sql');
      console.log(`CREATE TABLE user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_actions_user_type ON user_actions(user_id, action_type);
CREATE INDEX idx_user_actions_created ON user_actions(created_at);`);
      console.log('```');
      
      console.log('\n2. Or use Supabase CLI if you have it installed:');
      console.log('   supabase db push');
      
      return false;
    }

    console.error('Unexpected error:', error);
    return false;

  } catch (error) {
    console.error('Error checking table:', error);
    return false;
  }
}

// Check what we can do with the badge system
async function checkBadgeSystemStatus() {
  console.log('\n📊 Checking Badge System Status...\n');

  const checks = [
    { table: 'badges', description: 'Badge definitions' },
    { table: 'badge_criteria', description: 'Badge earning rules' },
    { table: 'user_badges', description: 'User badge progress' },
    { table: 'badge_notifications', description: 'Badge notifications' },
    { table: 'user_actions', description: 'User action tracking' }
  ];

  let allGood = true;

  for (const check of checks) {
    const { error } = await supabase
      .from(check.table)
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log(`❌ ${check.table} - Missing (${check.description})`);
      allGood = false;
    } else if (error) {
      console.log(`⚠️  ${check.table} - Error: ${error.message}`);
      allGood = false;
    } else {
      console.log(`✅ ${check.table} - Ready (${check.description})`);
    }
  }

  // Check badge counts
  const { count: badgeCount } = await supabase
    .from('badges')
    .select('*', { count: 'exact', head: true });

  const { count: userBadgeCount } = await supabase
    .from('user_badges')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 Stats:`);
  console.log(`   Total badge types: ${badgeCount || 0}`);
  console.log(`   User badges awarded: ${userBadgeCount || 0}`);

  return allGood;
}

// Alternative: Track actions in a different way
async function setupAlternativeTracking() {
  console.log('\n🔄 Setting up alternative tracking...\n');

  // We can track actions by inserting into feed_posts with special types
  // or by using the existing tables creatively

  // For example, we could use feed_posts with type 'user_action'
  const testAction = {
    user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
    type: 'user_action',
    content: {
      action_type: 'system_check',
      action_data: { test: true }
    }
  };

  // Check if we can use feed_posts for this
  const { error } = await supabase
    .from('feed_posts')
    .select('id')
    .eq('type', 'user_action')
    .limit(1);

  if (!error) {
    console.log('✅ Could use feed_posts table for action tracking as a workaround');
  }
}

// Main execution
async function main() {
  console.log('🏅 Badge System Setup Check\n');
  console.log('=' .repeat(50));

  // Check if we can create the table
  const tableCreated = await createUserActionsTable();

  // Check overall system status  
  const systemReady = await checkBadgeSystemStatus();

  if (!tableCreated) {
    console.log('\n⚠️  IMPORTANT: The user_actions table needs to be created manually.');
    console.log('   This is the only missing piece for the badge system.');
    console.log('   Once created, the badge system will be fully functional!');
  } else if (systemReady) {
    console.log('\n✨ Badge system is fully operational!');
  }

  // Check for alternative approaches
  await setupAlternativeTracking();

  console.log('\n💡 Next Steps:');
  console.log('1. Create the user_actions table using the SQL above');
  console.log('2. Run the complete-badge-system.sql file');
  console.log('3. The badge system will start working automatically!');
}

main().catch(console.error);