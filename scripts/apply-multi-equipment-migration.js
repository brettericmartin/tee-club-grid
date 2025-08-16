#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Applying multi-equipment photos migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', 'add-multi-equipment-photos.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    
    console.log('📋 Migration loaded from:', migrationPath);
    console.log('\n⚠️  IMPORTANT: This migration needs to be run in Supabase Dashboard\n');
    
    // Check current constraint
    const { data: constraints, error: constraintError } = await supabase.rpc('sql_query', {
      query: `
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'feed_posts'::regclass
        AND contype = 'c'
        AND conname LIKE '%type%';
      `
    });
    
    if (constraintError) {
      console.log('Could not check constraints via RPC, trying alternative...');
    } else {
      console.log('Current type constraint:', constraints);
    }
    
    // Check if multi_equipment_photos type exists
    const { data: testPost, error: testError } = await supabase
      .from('feed_posts')
      .select('type')
      .eq('type', 'multi_equipment_photos')
      .limit(1);
    
    if (testError && testError.message.includes('invalid input value')) {
      console.log('❌ "multi_equipment_photos" type not yet supported in database');
      console.log('\n📝 To apply the migration:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of:');
      console.log('   supabase/migrations/add-multi-equipment-photos.sql');
      console.log('4. Click "Run"');
      console.log('\n✨ This will enable:');
      console.log('   - New post type "multi_equipment_photos"');
      console.log('   - Validation triggers for multi-photo posts');
      console.log('   - Automatic equipment_photos population');
      console.log('   - Optimized indexes for performance');
    } else {
      console.log('✅ Database already supports multi_equipment_photos type or no constraint exists');
    }
    
    // Check if media_urls column exists
    const { data: columns } = await supabase.rpc('sql_query', {
      query: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'feed_posts' 
        AND column_name = 'media_urls';
      `
    });
    
    if (columns && columns.length > 0) {
      console.log('✅ media_urls column exists');
    } else {
      console.log('⚠️  media_urls column may need to be added');
    }
    
  } catch (error) {
    console.error('Error during migration check:', error);
  }
  
  console.log('\n📄 Migration file location:');
  console.log('   supabase/migrations/add-multi-equipment-photos.sql');
  console.log('\n🎯 Next steps:');
  console.log('1. Run the migration in Supabase Dashboard');
  console.log('2. Test multi-photo upload feature');
  console.log('3. Verify feed displays correctly');
  
  process.exit(0);
}

applyMigration().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});