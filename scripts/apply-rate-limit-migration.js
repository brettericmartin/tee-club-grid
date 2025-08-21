import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Applying Rate Limiting and Anti-Abuse Migration\n');
  console.log('=' .repeat(60));
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-rate-limit-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Migration will create:');
    console.log('   - rate_limit_buckets table (leaky bucket algorithm)');
    console.log('   - abuse_metrics table (tracking abuse patterns)');
    console.log('   - Helper functions for cleanup and monitoring');
    console.log('   - Feature flags for CAPTCHA configuration');
    console.log('\n⚠️  Note: This migration needs to be run in Supabase SQL editor');
    console.log('   Copy the contents of scripts/create-rate-limit-tables.sql');
    console.log('   and execute in your Supabase dashboard.\n');
    
    // Check if tables already exist
    console.log('Checking existing tables...\n');
    
    const { data: rateLimitTable, error: rateLimitError } = await supabase
      .from('rate_limit_buckets')
      .select('identifier')
      .limit(1);
    
    if (!rateLimitError) {
      console.log('✅ rate_limit_buckets table already exists');
    } else if (rateLimitError.code === '42P01') {
      console.log('❌ rate_limit_buckets table does not exist - needs creation');
    }
    
    const { data: abuseTable, error: abuseError } = await supabase
      .from('abuse_metrics')
      .select('id')
      .limit(1);
    
    if (!abuseError) {
      console.log('✅ abuse_metrics table already exists');
    } else if (abuseError.code === '42P01') {
      console.log('❌ abuse_metrics table does not exist - needs creation');
    }
    
    // Check feature flags
    const { data: featureFlags, error: flagsError } = await supabase
      .from('feature_flags')
      .select('captcha_enabled, rate_limit_enabled')
      .eq('id', 1)
      .single();
    
    if (!flagsError && featureFlags) {
      console.log('\n📊 Current Feature Flags:');
      console.log(`   Rate Limiting: ${featureFlags.rate_limit_enabled ?? 'not configured'}`);
      console.log(`   CAPTCHA: ${featureFlags.captcha_enabled ?? 'not configured'}`);
    } else {
      console.log('\n⚠️  Feature flags not properly configured');
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('1. Run the SQL migration in Supabase dashboard');
    console.log('2. Set environment variables:');
    console.log('   - RATE_LIMIT_ENABLED=true');
    console.log('   - TURNSTILE_SITE_KEY=your_key');
    console.log('   - TURNSTILE_SECRET_KEY=your_secret');
    console.log('3. Run tests: node scripts/test-rate-limiting.js');
    
    console.log('\n✅ Configuration check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

runMigration().catch(console.error);