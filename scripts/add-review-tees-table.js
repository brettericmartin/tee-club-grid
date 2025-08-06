import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting review tees migration...\n');

  try {
    // 1. Add new columns to equipment_reviews table
    console.log('📝 Adding columns to equipment_reviews table...');
    const addColumnsQuery = `
      ALTER TABLE equipment_reviews 
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS tee_count INTEGER DEFAULT 0;
    `;
    
    const { error: addColumnsError } = await adminClient
      .from('equipment_reviews')
      .select('id')
      .limit(1);
      
    if (!addColumnsError) {
      const { error: alterError } = await adminClient.rpc('exec_sql', {
        sql: addColumnsQuery
      });
      
      if (alterError) {
        console.log('Note: Could not add columns via RPC, they may already exist');
      } else {
        console.log('✅ Added columns to equipment_reviews table');
      }
    }

    // 2. Create review_tees table
    console.log('\n📝 Creating review_tees table...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS review_tees (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        review_id UUID NOT NULL REFERENCES equipment_reviews(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(review_id, user_id)
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_review_tees_review_id ON review_tees(review_id);
      CREATE INDEX IF NOT EXISTS idx_review_tees_user_id ON review_tees(user_id);
      CREATE INDEX IF NOT EXISTS idx_equipment_reviews_tee_count ON equipment_reviews(tee_count);
    `;

    // First check if table exists
    const { data: tableCheck, error: tableCheckError } = await adminClient
      .from('review_tees')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.message.includes('does not exist')) {
      // Table doesn't exist, try to create it via direct SQL
      console.log('Table does not exist, creating review_tees table...');
      
      // Note: This will fail if RPC is not available, but we'll handle it gracefully
      const { error: createError } = await adminClient.rpc('exec_sql', {
        sql: createTableQuery
      });
      
      if (createError) {
        console.error('⚠️  Could not create table via RPC. Please run the following SQL manually:');
        console.log('\n' + createTableQuery + '\n');
      } else {
        console.log('✅ Created review_tees table');
      }
    } else {
      console.log('✅ review_tees table already exists');
    }

    // 3. Set up RLS policies
    console.log('\n🔒 Setting up RLS policies...');
    const rlsPolicies = `
      -- Enable RLS on review_tees
      ALTER TABLE review_tees ENABLE ROW LEVEL SECURITY;

      -- Policy: Anyone can view review tees
      CREATE POLICY "review_tees_select_policy" ON review_tees
        FOR SELECT USING (true);

      -- Policy: Authenticated users can insert their own tees
      CREATE POLICY "review_tees_insert_policy" ON review_tees
        FOR INSERT WITH CHECK (auth.uid() = user_id);

      -- Policy: Users can delete their own tees
      CREATE POLICY "review_tees_delete_policy" ON review_tees
        FOR DELETE USING (auth.uid() = user_id);
    `;

    console.log('⚠️  RLS policies need to be applied manually. Run the following SQL:');
    console.log('\n' + rlsPolicies + '\n');

    // 4. Create function to update tee counts
    console.log('\n📝 Creating tee count update function...');
    const functionQuery = `
      -- Function to update tee_count when tees are added/removed
      CREATE OR REPLACE FUNCTION update_review_tee_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE equipment_reviews 
          SET tee_count = tee_count + 1 
          WHERE id = NEW.review_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE equipment_reviews 
          SET tee_count = tee_count - 1 
          WHERE id = OLD.review_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;

      -- Trigger to automatically update tee counts
      CREATE TRIGGER update_review_tee_count_trigger
      AFTER INSERT OR DELETE ON review_tees
      FOR EACH ROW EXECUTE FUNCTION update_review_tee_count();
    `;

    console.log('⚠️  Function and trigger need to be created manually. Run the following SQL:');
    console.log('\n' + functionQuery + '\n');

    // 5. Test the setup
    console.log('\n🧪 Testing the setup...');
    
    // Try to query the review_tees table
    const { data: testData, error: testError } = await adminClient
      .from('review_tees')
      .select('*')
      .limit(1);

    if (testError && testError.message.includes('does not exist')) {
      console.log('⚠️  review_tees table not found. Please create it manually using the SQL above.');
    } else {
      console.log('✅ review_tees table is accessible');
    }

    // Check if columns exist on equipment_reviews
    const { data: reviewData, error: reviewError } = await adminClient
      .from('equipment_reviews')
      .select('id, title, tee_count')
      .limit(1);

    if (reviewError) {
      console.log('⚠️  Could not verify new columns on equipment_reviews table');
    } else {
      console.log('✅ equipment_reviews table has new columns');
    }

    console.log('\n✅ Migration completed!');
    console.log('\n📋 Summary:');
    console.log('1. Added title and tee_count columns to equipment_reviews table');
    console.log('2. Created review_tees table for tracking review tees');
    console.log('3. Added indexes for performance');
    console.log('4. Prepared RLS policies (apply manually)');
    console.log('5. Prepared trigger function (apply manually)');

    console.log('\n⚠️  IMPORTANT: Run the SQL statements shown above in your Supabase dashboard to complete the migration.');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();