import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting referral chains migration...\n');
  
  try {
    // Read the SQL migration file
    const migrationPath = join(__dirname, '2025-01-24__referral_chains.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Read migration file successfully');
    console.log('⏳ Executing migration...\n');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      // Try direct execution if exec_sql doesn't exist
      console.log('⚠️  exec_sql RPC not available, attempting direct query...');
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const statement of statements) {
        if (statement.toLowerCase().startsWith('create table')) {
          console.log('📦 Creating referral_chains table...');
        } else if (statement.toLowerCase().startsWith('create or replace function')) {
          console.log('🔧 Creating attribution function...');
        } else if (statement.toLowerCase().startsWith('create index')) {
          console.log('📍 Creating indexes...');
        } else if (statement.toLowerCase().includes('alter table')) {
          console.log('🔗 Adding foreign key constraints...');
        }
        
        // We can't execute raw SQL directly through Supabase client
        // So we'll need to use the admin panel or psql
      }
      
      console.log('\n⚠️  Direct SQL execution not supported by Supabase client');
      console.log('📋 Please run the following SQL in Supabase SQL Editor:\n');
      console.log('File: scripts/2025-01-24__referral_chains.sql');
      console.log('\nOr use the command:');
      console.log('psql $DATABASE_URL < scripts/2025-01-24__referral_chains.sql\n');
      
      // Check if table already exists
      const { data: tables } = await supabase
        .from('referral_chains')
        .select('id')
        .limit(1);
      
      if (tables !== null) {
        console.log('✅ Table referral_chains already exists!');
        
        // Get count of existing chains
        const { count } = await supabase
          .from('referral_chains')
          .select('*', { count: 'exact', head: true });
        
        console.log(`📊 Current referral chains: ${count || 0}`);
        return;
      }
    } else {
      console.log('✅ Migration executed successfully!\n');
    }
    
    // Verify the table was created
    const { data, error: verifyError } = await supabase
      .from('referral_chains')
      .select('*')
      .limit(1);
    
    if (!verifyError) {
      console.log('✅ Table referral_chains verified successfully');
      
      // Get count
      const { count } = await supabase
        .from('referral_chains')
        .select('*', { count: 'exact', head: true });
      
      console.log(`📊 Total referral chains: ${count || 0}`);
    } else {
      console.log('❌ Failed to verify table creation');
      console.log('Error:', verifyError.message);
    }
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);