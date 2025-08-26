/**
 * Script to run referral code migration
 * Generates unique referral codes for all existing profiles
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
// Also try .env.local for service key
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate a unique referral code
function generateReferralCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

// Check if a code already exists
async function codeExists(code) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', code)
    .single();
  
  return !error && data !== null;
}

// Generate a unique code with retry logic
async function generateUniqueCode(maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateReferralCode();
    const exists = await codeExists(code);
    
    if (!exists) {
      return code;
    }
    
    console.log(`   Code ${code} already exists, retrying... (${i + 1}/${maxRetries})`);
  }
  
  throw new Error('Failed to generate unique code after max retries');
}

async function runMigration() {
  console.log('🚀 Starting referral code migration...\n');
  
  try {
    // Step 1: Get all profiles without referral codes
    console.log('📊 Fetching profiles without referral codes...');
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, display_name, created_at')
      .is('referral_code', null)
      .order('created_at', { ascending: true });
    
    if (fetchError) {
      throw new Error(`Failed to fetch profiles: ${fetchError.message}`);
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('✅ All profiles already have referral codes!');
      await showStatistics();
      return;
    }
    
    console.log(`Found ${profiles.length} profiles without referral codes\n`);
    
    // Step 2: Generate and assign codes
    console.log('🔄 Generating unique referral codes...\n');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const progress = `[${i + 1}/${profiles.length}]`;
      
      try {
        // Generate unique code
        const code = await generateUniqueCode();
        
        // Update profile with new code
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ referral_code: code })
          .eq('id', profile.id);
        
        if (updateError) {
          throw updateError;
        }
        
        successCount++;
        console.log(`${progress} ✓ ${profile.display_name || profile.email || profile.id} → ${code}`);
        
        // Show progress every 10 profiles
        if ((i + 1) % 10 === 0) {
          console.log(`   Progress: ${successCount} successful, ${errorCount} errors`);
        }
      } catch (error) {
        errorCount++;
        errors.push({ profile: profile.id, error: error.message });
        console.error(`${progress} ✗ Failed for ${profile.id}: ${error.message}`);
      }
    }
    
    // Step 3: Show results
    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Results:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${successCount} profiles`);
    console.log(`❌ Errors encountered: ${errorCount} profiles`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Error Details:');
      errors.forEach(e => {
        console.log(`   - Profile ${e.profile}: ${e.error}`);
      });
    }
    
    // Step 4: Show final statistics
    await showStatistics();
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

async function showStatistics() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Final Statistics:');
  console.log('='.repeat(60));
  
  try {
    // Get total profiles
    const { count: totalProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    // Get profiles with codes
    const { count: profilesWithCodes } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('referral_code', 'is', null);
    
    // Get profiles without codes
    const { count: profilesWithoutCodes } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .is('referral_code', null);
    
    console.log(`Total profiles: ${totalProfiles || 0}`);
    console.log(`Profiles with referral codes: ${profilesWithCodes || 0}`);
    console.log(`Profiles without referral codes: ${profilesWithoutCodes || 0}`);
    
    // Check for duplicates
    const { data: duplicates } = await supabase
      .from('profiles')
      .select('referral_code')
      .not('referral_code', 'is', null);
    
    if (duplicates) {
      const codeMap = new Map();
      duplicates.forEach(p => {
        if (p.referral_code) {
          codeMap.set(p.referral_code, (codeMap.get(p.referral_code) || 0) + 1);
        }
      });
      
      const duplicateCodes = Array.from(codeMap.entries()).filter(([_, count]) => count > 1);
      
      if (duplicateCodes.length > 0) {
        console.log('\n⚠️  WARNING: Duplicate codes detected:');
        duplicateCodes.forEach(([code, count]) => {
          console.log(`   - Code ${code}: ${count} occurrences`);
        });
      } else {
        console.log('\n✅ All referral codes are unique!');
      }
    }
    
    // Show sample codes
    const { data: samples } = await supabase
      .from('profiles')
      .select('display_name, email, referral_code')
      .not('referral_code', 'is', null)
      .limit(5);
    
    if (samples && samples.length > 0) {
      console.log('\n📝 Sample referral codes:');
      samples.forEach(s => {
        const name = s.display_name || s.email || 'Unknown';
        console.log(`   - ${name}: ${s.referral_code}`);
      });
    }
    
  } catch (error) {
    console.error('Failed to fetch statistics:', error.message);
  }
}

// Add option to run SQL migration directly
async function runSqlMigration() {
  console.log('📄 Running SQL migration file...\n');
  
  const sqlPath = path.join(__dirname, '2025-01-24__profiles_referral_code_backfill.sql');
  
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ SQL migration file not found:', sqlPath);
    console.log('   Running JavaScript migration instead...\n');
    return false;
  }
  
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Note: Supabase client doesn't support running raw SQL directly
    // This would need to be run via psql or Supabase dashboard
    console.log('ℹ️  SQL migration file found. Please run this SQL directly in Supabase:');
    console.log('   - Via Supabase Dashboard: SQL Editor');
    console.log('   - Or via psql command line');
    console.log(`   - File: ${sqlPath}\n`);
    
    return false; // Continue with JS migration
  } catch (error) {
    console.error('Failed to read SQL file:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('=' .repeat(60));
  console.log('🎯 Teed.club Referral Code Migration');
  console.log('=' .repeat(60) + '\n');
  
  // Check if we should run SQL or JS migration
  const args = process.argv.slice(2);
  const useSql = args.includes('--sql');
  
  if (useSql) {
    const sqlRan = await runSqlMigration();
    if (sqlRan) return;
  }
  
  // Run JavaScript migration
  await runMigration();
  
  console.log('\n✅ Migration completed successfully!');
}

// Run the migration
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});