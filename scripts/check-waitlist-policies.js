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

async function checkPolicies() {
  console.log('🔍 Checking waitlist RLS policies...\n');

  try {
    // Get all policies for waitlist table
    let policies, error;
    try {
      const result = await supabase
        .rpc('get_policies_for_table', { table_name: 'waitlist' });
      policies = result.data;
      error = result.error;
    } catch (err) {
      policies = null;
      error = 'Function not found';
    }

    if (error || !policies) {
      // Try direct query to pg_policies
      const { data: directPolicies, error: directError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'waitlist');
      
      if (directPolicies) {
        console.log('Found policies via pg_policies:', directPolicies);
      } else {
        console.log('Could not query policies directly');
      }
    } else {
      console.log('Waitlist policies:', policies);
    }

    // Test anonymous insert capability
    console.log('\n📝 Testing anonymous INSERT...');
    
    // Create an anonymous client
    const anonClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    const testEmail = `anon-test-${Date.now()}@example.com`;
    const { data: insertData, error: insertError } = await anonClient
      .from('waitlist')
      .insert({ email: testEmail })
      .select()
      .single();
    
    if (insertData) {
      console.log('✅ Anonymous INSERT successful!');
      console.log('   Created entry:', insertData.id);
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', insertData.id);
      
      if (!deleteError) {
        console.log('   Cleaned up test entry');
      }
    } else {
      console.log('❌ Anonymous INSERT failed:', insertError?.message);
      console.log('   Error details:', insertError);
    }
    
    // Test service role capabilities
    console.log('\n🔑 Testing service role capabilities...');
    
    const serviceTestEmail = `service-test-${Date.now()}@example.com`;
    const { data: serviceData, error: serviceError } = await supabase
      .from('waitlist')
      .insert({ email: serviceTestEmail })
      .select()
      .single();
    
    if (serviceData) {
      console.log('✅ Service role INSERT successful!');
      
      // Test update
      const { error: updateError } = await supabase
        .from('waitlist')
        .update({ approved_at: new Date().toISOString() })
        .eq('id', serviceData.id);
      
      if (!updateError) {
        console.log('✅ Service role UPDATE successful!');
      } else {
        console.log('❌ Service role UPDATE failed:', updateError?.message);
      }
      
      // Clean up
      await supabase.from('waitlist').delete().eq('id', serviceData.id);
      console.log('   Cleaned up test entry');
    } else {
      console.log('❌ Service role INSERT failed:', serviceError?.message);
    }
    
    console.log('\n✅ Policy check complete!');
    
  } catch (error) {
    console.error('Error checking policies:', error);
  }
}

checkPolicies();