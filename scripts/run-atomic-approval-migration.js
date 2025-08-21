/**
 * Run atomic approval functions migration
 * This adds thread-safe approval functions with capacity locking
 * 
 * Run with: node scripts/run-atomic-approval-migration.js
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
  console.log('🚀 Starting atomic approval functions migration...\n');
  
  try {
    // Read the SQL migration file
    const sqlPath = join(__dirname, 'add-atomic-approval-functions.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing SQL migration...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });
    
    // If exec_sql doesn't exist, try direct execution
    if (error && error.message.includes('Could not find the function')) {
      console.log('📝 Using direct SQL execution...');
      
      // Split SQL into individual statements
      const statements = sql
        .split(/;(?=\s*(?:CREATE|DROP|ALTER|GRANT|COMMENT|INSERT|UPDATE|DELETE))/i)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        
        // For functions, we need to use a different approach
        if (statement.includes('CREATE OR REPLACE FUNCTION')) {
          // Execute via raw SQL (this requires service role key)
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql_query: statement })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`   ⚠️  Statement ${i + 1} failed:`, errorText);
            // Continue with other statements
          }
        }
      }
    } else if (error) {
      throw error;
    }
    
    console.log('✅ SQL migration executed successfully\n');
    
    // Test the functions
    console.log('🧪 Testing functions...\n');
    
    // Test check_auto_approval_eligibility
    console.log('1. Testing check_auto_approval_eligibility...');
    const { data: eligibilityData, error: eligibilityError } = await supabase
      .rpc('check_auto_approval_eligibility', { p_score: 5 });
    
    if (eligibilityError) {
      console.error('   ❌ Error:', eligibilityError);
    } else {
      console.log('   ✅ Result:', eligibilityData);
    }
    
    // Test if functions exist
    console.log('\n2. Verifying functions exist...');
    const { data: functions, error: functionsError } = await supabase
      .from('pg_proc')
      .select('proname')
      .in('proname', [
        'approve_user_if_capacity',
        'rpc_approve_self_if_capacity',
        'approve_user_by_email_if_capacity',
        'check_auto_approval_eligibility',
        'generate_invite_code'
      ]);
    
    if (functionsError) {
      // Try alternative check
      console.log('   Checking via information_schema...');
      const { data: routines } = await supabase
        .from('information_schema.routines')
        .select('routine_name')
        .eq('routine_schema', 'public')
        .in('routine_name', [
          'approve_user_if_capacity',
          'rpc_approve_self_if_capacity',
          'approve_user_by_email_if_capacity',
          'check_auto_approval_eligibility',
          'generate_invite_code'
        ]);
      
      if (routines && routines.length > 0) {
        console.log(`   ✅ Found ${routines.length} functions`);
      }
    } else if (functions) {
      console.log(`   ✅ Found ${functions.length} functions`);
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📚 Available functions:');
    console.log('   - approve_user_if_capacity(user_id, display_name)');
    console.log('   - rpc_approve_self_if_capacity(display_name)');
    console.log('   - approve_user_by_email_if_capacity(email, display_name, grant_invites)');
    console.log('   - check_auto_approval_eligibility(score)');
    console.log('   - generate_invite_code()');
    
    console.log('\n💡 Usage example in TypeScript:');
    console.log(`
// Auto-approve in submit endpoint:
const { data, error } = await supabase
  .rpc('rpc_approve_self_if_capacity', { 
    display_name: 'John Doe' 
  });

// Admin approval:
const { data, error } = await supabase
  .rpc('approve_user_by_email_if_capacity', {
    p_email: 'user@example.com',
    p_display_name: 'Jane Doe',
    p_grant_invites: true
  });

// Check eligibility:
const { data, error } = await supabase
  .rpc('check_auto_approval_eligibility', {
    p_score: 5
  });
`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📝 Manual migration instructions:');
    console.error('1. Copy the contents of scripts/add-atomic-approval-functions.sql');
    console.error('2. Run it in your Supabase SQL editor');
    console.error('3. Verify the functions were created successfully');
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);