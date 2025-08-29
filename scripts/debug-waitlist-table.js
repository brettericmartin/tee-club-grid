import './supabase-admin.js';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function debugWaitlist() {
  console.log('🔍 Debugging waitlist table...\n');
  
  console.log('Environment check:');
  console.log('- VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('- VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  console.log('- Service key:', (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) ? '✅ Set' : '❌ Missing');
  
  try {
    // First, let's see if we can query the table at all
    console.log('\n1. Testing basic SELECT:');
    const { data: selectData, error: selectError, status, statusText } = await supabase
      .from('waitlist')
      .select('*')
      .limit(5);
    
    console.log('   Status:', status, statusText);
    if (selectError) {
      console.log('   ❌ SELECT failed:', selectError.message);
      console.log('   Error details:', selectError);
    } else {
      console.log('   ✅ SELECT successful, found', selectData?.length || 0, 'entries');
      if (selectData && selectData.length > 0) {
        console.log('   Sample entry structure:', Object.keys(selectData[0]));
      }
    }
    
    // Try a simple insert with minimal data
    console.log('\n2. Testing minimal INSERT:');
    const testEmail = `debug-${Date.now()}@test.com`;
    console.log('   Attempting to insert:', testEmail);
    
    const { data: insertData, error: insertError, status: insertStatus, statusText: insertStatusText } = await supabase
      .from('waitlist')
      .insert({ email: testEmail })
      .select();
    
    console.log('   Status:', insertStatus, insertStatusText);
    if (insertError) {
      console.log('   ❌ INSERT failed:', insertError.message);
      console.log('   Error code:', insertError.code);
      console.log('   Error hint:', insertError.hint);
      console.log('   Full error:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('   ✅ INSERT successful!');
      console.log('   Created entry:', insertData);
      
      // Try to delete it
      if (insertData && insertData[0]) {
        const { error: deleteError } = await supabase
          .from('waitlist')
          .delete()
          .eq('id', insertData[0].id);
        
        if (!deleteError) {
          console.log('   ✅ Cleanup successful');
        } else {
          console.log('   ⚠️ Cleanup failed:', deleteError.message);
        }
      }
    }
    
    // Check table structure
    console.log('\n3. Checking table structure:');
    const { data: structureData, error: structureError } = await supabase
      .from('waitlist')
      .select()
      .limit(0);
    
    if (!structureError) {
      console.log('   ✅ Table exists and is queryable');
    } else {
      console.log('   ❌ Table structure issue:', structureError.message);
    }
    
    // Try raw RPC call to check if RLS is the issue
    console.log('\n4. Testing with RPC (bypasses RLS):');
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('insert_waitlist_entry', {
        user_email: `rpc-test-${Date.now()}@test.com`
      });
      
      if (rpcError) {
        console.log('   RPC function not found or failed:', rpcError.message);
      } else {
        console.log('   RPC succeeded:', rpcData);
      }
    } catch (e) {
      console.log('   RPC call failed:', e.message);
    }
    
  } catch (error) {
    console.error('\nUnexpected error:', error);
  }
}

debugWaitlist();