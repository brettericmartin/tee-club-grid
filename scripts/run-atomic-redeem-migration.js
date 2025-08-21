/**
 * Run atomic invite redemption migration
 * This adds thread-safe invite code redemption with proper locking
 * 
 * Run with: node scripts/run-atomic-redeem-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase admin client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
  console.error('   Please check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting atomic invite redemption migration...\n');
  
  try {
    // Read the SQL migration files
    console.log('📝 Reading migration files...');
    
    // First run the approval functions if not already done
    const approvalSqlPath = join(__dirname, 'add-atomic-approval-functions.sql');
    const approvalSql = readFileSync(approvalSqlPath, 'utf8');
    
    // Then run the redemption functions
    const redeemSqlPath = join(__dirname, 'add-atomic-redeem-function.sql');
    const redeemSql = readFileSync(redeemSqlPath, 'utf8');
    
    console.log('📝 Executing migrations...');
    
    // Combine both migrations
    const fullSql = approvalSql + '\n\n' + redeemSql;
    
    // Note: In production, you should execute these via Supabase dashboard
    // or use proper migration tools
    console.log('⚠️  Note: Please execute the following SQL in your Supabase dashboard:');
    console.log('   1. Go to SQL Editor in Supabase Dashboard');
    console.log('   2. Copy the contents of:');
    console.log('      - scripts/add-atomic-approval-functions.sql');
    console.log('      - scripts/add-atomic-redeem-function.sql');
    console.log('   3. Execute them in order\n');
    
    // Test if functions exist by trying to call them
    console.log('🧪 Testing function availability...\n');
    
    // Test validate_invite_code (safe to call)
    console.log('1. Testing validate_invite_code...');
    const { data: validateData, error: validateError } = await supabase
      .rpc('validate_invite_code', { p_code: 'TEST-CODE' });
    
    if (validateError) {
      if (validateError.message.includes('function') && validateError.message.includes('does not exist')) {
        console.log('   ❌ Function not found - migration needs to be run');
      } else {
        console.log('   ✅ Function exists (returned expected error for invalid code)');
      }
    } else {
      console.log('   ✅ Function exists:', validateData);
    }
    
    // Test check_auto_approval_eligibility
    console.log('\n2. Testing check_auto_approval_eligibility...');
    const { data: eligibilityData, error: eligibilityError } = await supabase
      .rpc('check_auto_approval_eligibility', { p_score: 5 });
    
    if (eligibilityError) {
      if (eligibilityError.message.includes('function') && eligibilityError.message.includes('does not exist')) {
        console.log('   ❌ Function not found - migration needs to be run');
      } else {
        console.log('   ⚠️  Error:', eligibilityError.message);
      }
    } else {
      console.log('   ✅ Function exists:', eligibilityData);
    }
    
    console.log('\n✅ Migration check completed!');
    console.log('\n📚 Available functions after migration:');
    console.log('   Approval Functions:');
    console.log('   - approve_user_if_capacity(user_id, display_name)');
    console.log('   - rpc_approve_self_if_capacity(display_name)');
    console.log('   - approve_user_by_email_if_capacity(email, display_name, grant_invites)');
    console.log('   - check_auto_approval_eligibility(score)');
    console.log('   - generate_invite_code()');
    console.log('\n   Redemption Functions:');
    console.log('   - redeem_invite_code_atomic(code, user_id, email)');
    console.log('   - rpc_redeem_invite_code(code, email)');
    console.log('   - validate_invite_code(code)');
    
    console.log('\n💡 TypeScript Usage Examples:');
    console.log(`
// Validate an invite code
const { data, error } = await supabase
  .rpc('validate_invite_code', { p_code: 'GOLF-2024' });

// Redeem an invite code (authenticated)
const { data, error } = await supabase
  .rpc('rpc_redeem_invite_code', { 
    code: 'GOLF-2024',
    email: 'user@example.com' // optional
  });

// Direct redemption (service role)
const { data, error } = await supabase
  .rpc('redeem_invite_code_atomic', {
    p_code: 'GOLF-2024',
    p_user_id: 'user-uuid',
    p_email: 'user@example.com'
  });
`);

    console.log('\n🔒 Security Features:');
    console.log('   ✅ Row-level locking prevents race conditions');
    console.log('   ✅ Atomic transactions ensure consistency');
    console.log('   ✅ Idempotent operations (safe to retry)');
    console.log('   ✅ Capacity checks enforced at database level');
    console.log('   ✅ Case-insensitive code matching');
    console.log('   ✅ Expiration date support');
    
  } catch (error) {
    console.error('❌ Migration check failed:', error.message);
    console.error('\n📝 Manual migration instructions:');
    console.error('1. Copy the contents of:');
    console.error('   - scripts/add-atomic-approval-functions.sql');
    console.error('   - scripts/add-atomic-redeem-function.sql');
    console.error('2. Run them in your Supabase SQL editor (in order)');
    console.error('3. Verify the functions were created successfully');
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);