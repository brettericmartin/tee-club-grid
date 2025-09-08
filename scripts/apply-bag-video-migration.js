import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('📦 Applying Bag Video Type Migration\n');
    console.log('='.repeat(40));
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250907_add_bag_video_type.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('\n📝 Migration contents:');
    console.log(migrationSQL.split('\n').slice(0, 20).join('\n') + '...\n');
    
    // Execute the migration
    console.log('🚀 Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    }).single();
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql RPC not available, trying direct execution...');
      
      // Split the migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.includes('DO $$')) {
          // Skip the DO block as it's just for notices
          continue;
        }
        
        console.log(`\nExecuting: ${statement.substring(0, 50)}...`);
        
        // For DDL statements, we need to use raw SQL through a different approach
        // Since Supabase client doesn't support DDL directly, we'll handle this differently
        console.log('✅ Statement would be executed (DDL operations need admin access)');
      }
      
      console.log('\n⚠️  Note: DDL operations require admin access.');
      console.log('The migration SQL has been generated and needs to be applied via:');
      console.log('1. Supabase Dashboard SQL Editor');
      console.log('2. Or via psql with admin credentials');
      
      // Let's check the current constraint to see what types are allowed
      console.log('\n🔍 Checking current feed_posts types...');
      const { data: checkData, error: checkError } = await supabase
        .from('feed_posts')
        .select('type')
        .limit(0);
      
      if (!checkError) {
        console.log('✅ Table accessible, but constraint check requires admin access');
      }
      
      // Try to insert a test video post to see if it works
      console.log('\n🧪 Testing if bag_video type is already supported...');
      
      // Get a test user and bag
      const { data: testUser } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();
      
      if (testUser) {
        const { data: testBag } = await supabase
          .from('user_bags')
          .select('id')
          .eq('user_id', testUser.id)
          .limit(1)
          .single();
        
        if (testBag) {
          // Try to create a test feed post with bag_video type
          const testPost = {
            user_id: testUser.id,
            type: 'bag_video',
            bag_id: testBag.id,
            content: {
              test: true,
              url: 'https://youtube.com/test',
              title: 'Test Video'
            },
            likes_count: 0
          };
          
          const { error: testError } = await supabase
            .from('feed_posts')
            .insert(testPost);
          
          if (testError) {
            if (testError.message.includes('feed_posts_type_check')) {
              console.log('❌ bag_video type is NOT supported yet');
              console.log('   The migration needs to be applied');
            } else {
              console.log('❌ Different error:', testError.message);
            }
          } else {
            console.log('✅ bag_video type is already supported!');
            // Clean up the test post
            await supabase
              .from('feed_posts')
              .delete()
              .eq('user_id', testUser.id)
              .eq('type', 'bag_video')
              .match({ 'content->test': true });
          }
        }
      }
      
    } else {
      console.log('✅ Migration executed successfully!');
    }
    
    console.log('\n' + '='.repeat(40));
    console.log('📋 Next steps:');
    console.log('1. If migration wasn\'t applied, copy the SQL from:');
    console.log(`   ${migrationPath}`);
    console.log('2. Paste it in the Supabase Dashboard SQL Editor');
    console.log('3. Run the test script to verify: node scripts/test-video-feed-post.js');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
  }
}

applyMigration();