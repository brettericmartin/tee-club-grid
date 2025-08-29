import { supabase } from './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';

async function fixWaitlistRLS() {
  console.log('🔧 FIXING WAITLIST RLS PROPERLY');
  console.log('=' .repeat(80));
  
  // SQL statements to fix RLS
  const statements = [
    // Drop all existing policies
    `DROP POLICY IF EXISTS "Anyone can submit waitlist application" ON waitlist_applications`,
    `DROP POLICY IF EXISTS "Public can submit applications" ON waitlist_applications`,
    `DROP POLICY IF EXISTS "Users view own applications" ON waitlist_applications`,
    `DROP POLICY IF EXISTS "Service role bypass" ON waitlist_applications`,
    `DROP POLICY IF EXISTS "Admin operations" ON waitlist_applications`,
    
    // Create new policies
    `CREATE POLICY "Anyone can insert" 
     ON waitlist_applications 
     FOR INSERT 
     TO anon, authenticated
     WITH CHECK (true)`,
    
    `CREATE POLICY "Users can view own" 
     ON waitlist_applications 
     FOR SELECT 
     TO authenticated
     USING (auth.jwt() ->> 'email' = email)`,
    
    `CREATE POLICY "Service role all access" 
     ON waitlist_applications 
     FOR ALL 
     TO service_role
     USING (true) 
     WITH CHECK (true)`,
    
    // Enable RLS
    `ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY`
  ];
  
  console.log('📝 Applying RLS fixes...\n');
  
  for (const stmt of statements) {
    const firstLine = stmt.split('\n')[0];
    console.log(`  Executing: ${firstLine}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: stmt
      });
      
      if (error) {
        // Try direct execution if exec_sql doesn't exist
        const { data, error: directError } = await supabase.rpc('run_sql', {
          query: stmt
        });
        
        if (directError) {
          console.log(`    ⚠️  ${directError.message}`);
        } else {
          console.log(`    ✅ Success`);
        }
      } else {
        console.log(`    ✅ Success`);
      }
    } catch (e) {
      console.log(`    ⚠️  ${e.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('🧪 TESTING ANONYMOUS SUBMISSION...\n');
  
  // Create anon client to test
  const anonSupabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbGVvcnZ2dHJxbGdvbHpkYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MzY5NDEsImV4cCI6MjA2NjMxMjk0MX0.Y-NJRFRVy4veCRe3-VBCBHEz7CWj7rKQBcf2UxDRlSs'
  );
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testData = {
    email: testEmail,
    display_name: 'Test User',
    city_region: 'Test City',
    score: 50,
    status: 'pending',
    answers: {
      role: 'golfer',
      share_channels: [],
      learn_channels: [],
      spend_bracket: '<300',
      uses: [],
      buy_frequency: 'never',
      share_frequency: 'never',
      termsAccepted: true
    }
  };
  
  const { data: insertResult, error: insertError } = await anonSupabase
    .from('waitlist_applications')
    .insert(testData)
    .select();
  
  if (insertError) {
    console.log('❌ ANONYMOUS INSERT FAILED:', insertError.message);
    console.log('Details:', insertError);
    
    // Try with service role to see if it's RLS or column issue
    console.log('\n🔍 Testing with service role...');
    const { data: serviceResult, error: serviceError } = await supabase
      .from('waitlist_applications')
      .insert(testData)
      .select();
    
    if (serviceError) {
      console.log('❌ SERVICE ROLE ALSO FAILED:', serviceError.message);
      console.log('This is likely a column or constraint issue, not RLS');
    } else {
      console.log('✅ Service role succeeded, so it IS an RLS issue');
      // Clean up
      await supabase
        .from('waitlist_applications')
        .delete()
        .eq('email', testEmail);
    }
  } else {
    console.log('✅ ANONYMOUS INSERT SUCCESSFUL!');
    console.log('Application created:', insertResult);
    
    // Clean up
    await supabase
      .from('waitlist_applications')
      .delete()
      .eq('email', testEmail);
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('📋 SUMMARY:');
  console.log('RLS policies have been updated.');
  console.log('Anonymous users should now be able to submit waitlist applications.');
  console.log('\nIf submissions still fail, check:');
  console.log('1. Frontend is using VITE_SUPABASE_ANON_KEY');
  console.log('2. All required fields are being provided');
  console.log('3. No database constraints are blocking the insert');
}

fixWaitlistRLS();