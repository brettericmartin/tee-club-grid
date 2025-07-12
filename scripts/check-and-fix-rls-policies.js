import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:');
  if (!supabaseUrl) console.error('- VITE_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAndFixRLSPolicies() {
  console.log('🔍 Checking and fixing RLS policies...\n');

  const tables = [
    'equipment_saves',
    'equipment_photos',
    'equipment_wishlist',
    'user_follows',
    'bag_likes',
    'photo_likes'
  ];

  for (const table of tables) {
    console.log(`\n📋 Checking policies for table: ${table}`);
    
    try {
      // Check if table exists
      const { data: tableData, error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (tableError && tableError.message.includes('does not exist')) {
        console.error(`❌ Table ${table} does not exist`);
        continue;
      }

      // Get existing policies
      const { data: policies, error: policyError } = await supabase.rpc('get_policies', {
        table_name: table
      }).catch(() => ({ data: null, error: 'Function not found' }));

      if (policyError || !policies) {
        console.log(`⚠️  Could not fetch policies for ${table}`);
        console.log(`   Will attempt to create standard policies...`);
      }

      // Create RLS policies based on table type
      const policySQL = generatePolicySQL(table);
      
      if (policySQL) {
        console.log(`✨ Creating/updating policies for ${table}...`);
        
        for (const sql of policySQL) {
          try {
            const { error } = await supabase.rpc('exec_sql', {
              sql: sql
            }).catch(async () => {
              // If exec_sql doesn't exist, try direct query
              console.log('   Using alternative method...');
              return { error: 'Need to apply manually' };
            });

            if (error) {
              console.log(`   ⚠️  Policy may need manual application`);
              console.log(`   SQL: ${sql.substring(0, 100)}...`);
            } else {
              console.log(`   ✅ Policy applied successfully`);
            }
          } catch (err) {
            console.error(`   ❌ Error: ${err.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error checking ${table}:`, error.message);
    }
  }

  console.log('\n\n📝 RLS Policy SQL Scripts:');
  console.log('Copy and run these in your Supabase SQL editor:\n');

  // Generate comprehensive SQL for all tables
  for (const table of tables) {
    const policies = generatePolicySQL(table);
    if (policies && policies.length > 0) {
      console.log(`\n-- Policies for ${table}`);
      console.log(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      policies.forEach(policy => {
        console.log(policy);
      });
    }
  }
}

function generatePolicySQL(table) {
  const policies = [];
  
  switch (table) {
    case 'equipment_saves':
      policies.push(
        `DROP POLICY IF EXISTS "Users can view their own saves" ON ${table};`,
        `CREATE POLICY "Users can view their own saves" ON ${table} FOR SELECT USING (auth.uid() = user_id);`,
        
        `DROP POLICY IF EXISTS "Users can create their own saves" ON ${table};`,
        `CREATE POLICY "Users can create their own saves" ON ${table} FOR INSERT WITH CHECK (auth.uid() = user_id);`,
        
        `DROP POLICY IF EXISTS "Users can delete their own saves" ON ${table};`,
        `CREATE POLICY "Users can delete their own saves" ON ${table} FOR DELETE USING (auth.uid() = user_id);`
      );
      break;

    case 'equipment_photos':
      policies.push(
        `DROP POLICY IF EXISTS "Anyone can view equipment photos" ON ${table};`,
        `CREATE POLICY "Anyone can view equipment photos" ON ${table} FOR SELECT USING (true);`,
        
        `DROP POLICY IF EXISTS "Users can upload their own photos" ON ${table};`,
        `CREATE POLICY "Users can upload their own photos" ON ${table} FOR INSERT WITH CHECK (auth.uid() = user_id);`,
        
        `DROP POLICY IF EXISTS "Users can update their own photos" ON ${table};`,
        `CREATE POLICY "Users can update their own photos" ON ${table} FOR UPDATE USING (auth.uid() = user_id);`,
        
        `DROP POLICY IF EXISTS "Users can delete their own photos" ON ${table};`,
        `CREATE POLICY "Users can delete their own photos" ON ${table} FOR DELETE USING (auth.uid() = user_id);`
      );
      break;

    case 'equipment_wishlist':
      policies.push(
        `DROP POLICY IF EXISTS "Users can view their own wishlist" ON ${table};`,
        `CREATE POLICY "Users can view their own wishlist" ON ${table} FOR SELECT USING (auth.uid() = user_id);`,
        
        `DROP POLICY IF EXISTS "Users can add to their wishlist" ON ${table};`,
        `CREATE POLICY "Users can add to their wishlist" ON ${table} FOR INSERT WITH CHECK (auth.uid() = user_id);`,
        
        `DROP POLICY IF EXISTS "Users can update their wishlist" ON ${table};`,
        `CREATE POLICY "Users can update their wishlist" ON ${table} FOR UPDATE USING (auth.uid() = user_id);`,
        
        `DROP POLICY IF EXISTS "Users can remove from wishlist" ON ${table};`,
        `CREATE POLICY "Users can remove from wishlist" ON ${table} FOR DELETE USING (auth.uid() = user_id);`
      );
      break;

    case 'user_follows':
      policies.push(
        `DROP POLICY IF EXISTS "Anyone can view follows" ON ${table};`,
        `CREATE POLICY "Anyone can view follows" ON ${table} FOR SELECT USING (true);`,
        
        `DROP POLICY IF EXISTS "Users can follow others" ON ${table};`,
        `CREATE POLICY "Users can follow others" ON ${table} FOR INSERT WITH CHECK (auth.uid() = follower_id);`,
        
        `DROP POLICY IF EXISTS "Users can unfollow" ON ${table};`,
        `CREATE POLICY "Users can unfollow" ON ${table} FOR DELETE USING (auth.uid() = follower_id);`
      );
      break;

    case 'bag_likes':
    case 'photo_likes':
      policies.push(
        `DROP POLICY IF EXISTS "Anyone can view likes" ON ${table};`,
        `CREATE POLICY "Anyone can view likes" ON ${table} FOR SELECT USING (true);`,
        
        `DROP POLICY IF EXISTS "Users can like" ON ${table};`,
        `CREATE POLICY "Users can like" ON ${table} FOR INSERT WITH CHECK (auth.uid() = user_id);`,
        
        `DROP POLICY IF EXISTS "Users can unlike" ON ${table};`,
        `CREATE POLICY "Users can unlike" ON ${table} FOR DELETE USING (auth.uid() = user_id);`
      );
      break;
  }

  return policies;
}

// Also check storage policies
async function checkStoragePolicies() {
  console.log('\n\n🗄️  Storage Bucket Policies:');
  console.log('Run these in your Supabase SQL editor:\n');

  const buckets = ['equipment-photos', 'user-avatars', 'bag-photos'];
  
  for (const bucket of buckets) {
    console.log(`\n-- Storage policies for ${bucket}`);
    console.log(`-- First, ensure the bucket exists`);
    console.log(`INSERT INTO storage.buckets (id, name, public) VALUES ('${bucket}', '${bucket}', true) ON CONFLICT (id) DO NOTHING;`);
    
    console.log(`\n-- Policies for ${bucket}`);
    console.log(`DROP POLICY IF EXISTS "Allow public read" ON storage.objects;`);
    console.log(`CREATE POLICY "Allow public read" ON storage.objects FOR SELECT USING (bucket_id = '${bucket}');`);
    
    console.log(`\nDROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;`);
    console.log(`CREATE POLICY "Allow authenticated upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = '${bucket}' AND auth.role() = 'authenticated');`);
    
    console.log(`\nDROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;`);
    console.log(`CREATE POLICY "Allow users to update own files" ON storage.objects FOR UPDATE USING (bucket_id = '${bucket}' AND auth.uid()::text = (storage.foldername(name))[1]);`);
    
    console.log(`\nDROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;`);
    console.log(`CREATE POLICY "Allow users to delete own files" ON storage.objects FOR DELETE USING (bucket_id = '${bucket}' AND auth.uid()::text = (storage.foldername(name))[1]);`);
  }
}

// Run the checks
checkAndFixRLSPolicies()
  .then(() => checkStoragePolicies())
  .then(() => {
    console.log('\n\n✅ RLS policy check complete!');
    console.log('Please run the SQL scripts above in your Supabase dashboard.');
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });