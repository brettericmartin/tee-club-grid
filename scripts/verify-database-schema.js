import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define expected schema
const EXPECTED_TABLES = [
  {
    name: 'profiles',
    required_columns: ['id', 'username', 'created_at', 'updated_at']
  },
  {
    name: 'equipment',
    required_columns: ['id', 'brand', 'model', 'category', 'created_at']
  },
  {
    name: 'user_bags',
    required_columns: ['id', 'user_id', 'name', 'is_primary', 'created_at', 'updated_at']
  },
  {
    name: 'bag_equipment',
    required_columns: ['id', 'bag_id', 'equipment_id', 'created_at']
  },
  {
    name: 'equipment_saves',
    required_columns: ['id', 'user_id', 'equipment_id', 'created_at']
  },
  {
    name: 'equipment_photos',
    required_columns: ['id', 'user_id', 'equipment_id', 'photo_url', 'created_at']
  },
  {
    name: 'equipment_wishlist',
    required_columns: ['id', 'user_id', 'equipment_id', 'created_at']
  },
  {
    name: 'user_follows',
    required_columns: ['id', 'follower_id', 'following_id', 'created_at']
  },
  {
    name: 'bag_likes',
    required_columns: ['id', 'user_id', 'bag_id', 'created_at']
  },
  {
    name: 'bag_tees',
    required_columns: ['id', 'user_id', 'bag_id', 'created_at']
  },
  {
    name: 'equipment_reviews',
    required_columns: ['id', 'user_id', 'equipment_id', 'rating', 'created_at']
  },
  {
    name: 'feed_posts',
    required_columns: ['id', 'user_id', 'post_type', 'created_at']
  }
];

async function verifyDatabaseSchema() {
  console.log('🔍 Verifying database schema...\n');
  
  let allGood = true;
  const issues = [];

  for (const table of EXPECTED_TABLES) {
    console.log(`\n📋 Checking table: ${table.name}`);
    
    try {
      // Try to query the table
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist')) {
          console.error(`❌ Table ${table.name} does not exist`);
          issues.push(`Table ${table.name} is missing`);
          allGood = false;
          continue;
        } else if (error.message.includes('permission denied')) {
          console.warn(`⚠️  Table ${table.name} exists but has RLS restrictions`);
        } else {
          console.error(`❌ Error querying ${table.name}: ${error.message}`);
          issues.push(`Cannot query table ${table.name}: ${error.message}`);
          allGood = false;
          continue;
        }
      }

      console.log(`✅ Table ${table.name} exists`);

      // Check required columns by looking at the returned data structure
      if (data && data.length > 0) {
        const sampleRow = data[0];
        const existingColumns = Object.keys(sampleRow);
        
        for (const column of table.required_columns) {
          if (!existingColumns.includes(column)) {
            console.error(`   ❌ Missing column: ${column}`);
            issues.push(`Table ${table.name} is missing column: ${column}`);
            allGood = false;
          }
        }
      }
    } catch (error) {
      console.error(`❌ Unexpected error checking ${table.name}:`, error.message);
      issues.push(`Unexpected error with table ${table.name}`);
      allGood = false;
    }
  }

  // Check storage buckets
  console.log('\n\n🗄️  Checking storage buckets...');
  const EXPECTED_BUCKETS = ['equipment-photos', 'user-avatars', 'bag-photos'];

  for (const bucket of EXPECTED_BUCKETS) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list('', { limit: 1 });

      if (error) {
        if (error.message.includes('not found')) {
          console.error(`❌ Storage bucket ${bucket} does not exist`);
          issues.push(`Storage bucket ${bucket} is missing`);
          allGood = false;
        } else {
          console.warn(`⚠️  Storage bucket ${bucket} exists but may have permission issues`);
        }
      } else {
        console.log(`✅ Storage bucket ${bucket} exists`);
      }
    } catch (error) {
      console.error(`❌ Error checking bucket ${bucket}:`, error.message);
      issues.push(`Cannot check storage bucket ${bucket}`);
      allGood = false;
    }
  }

  // Summary
  console.log('\n\n📊 Schema Verification Summary:');
  console.log('================================');
  
  if (allGood) {
    console.log('✅ All checks passed! Your database schema is properly set up.');
  } else {
    console.log('❌ Schema verification failed. Issues found:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    
    console.log('\n📝 To fix these issues:');
    console.log('1. Run the SQL scripts in the /supabase directory');
    console.log('2. Execute the RLS policies script: scripts/generate-rls-policies.sql');
    console.log('3. Ensure all storage buckets are created in your Supabase dashboard');
  }

  // Test authentication
  console.log('\n\n🔐 Testing authentication...');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.log('⚠️  No authenticated user found (this is normal if not logged in)');
    } else {
      console.log(`✅ Authenticated as user: ${user.id}`);
    }
  } catch (error) {
    console.error('❌ Authentication check failed:', error.message);
  }

  return allGood;
}

// Run the verification
verifyDatabaseSchema()
  .then(success => {
    if (success) {
      console.log('\n✅ Database schema verification completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Database schema verification failed. Please fix the issues above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Fatal error during verification:', error);
    process.exit(1);
  });