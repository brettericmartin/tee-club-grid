import './supabase-admin.js';
import { supabase } from './supabase-admin.js';

async function debugAuthLoading() {
  console.log('🔍 Debugging auth and loading issues...\n');

  try {
    // Check current session
    console.log('1️⃣ Checking current auth session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
    } else if (session) {
      console.log('✅ Active session found');
      console.log('  - User ID:', session.user.id);
      console.log('  - Email:', session.user.email);
      console.log('  - Expires at:', new Date(session.expires_at * 1000).toISOString());
      console.log('  - Token expires in:', Math.floor((session.expires_at * 1000 - Date.now()) / 1000 / 60), 'minutes');
    } else {
      console.log('⚠️  No active session');
    }

    // Test queries that might be failing
    console.log('\n2️⃣ Testing common queries that might fail after actions...');
    
    // Test feed posts query
    const { data: feedData, error: feedError } = await supabase
      .from('feed_posts')
      .select('*')
      .limit(1);
    
    if (feedError) {
      console.error('❌ Feed posts query failed:', feedError.message);
      if (feedError.message.includes('JWT')) {
        console.error('   TOKEN ISSUE DETECTED!');
      }
    } else {
      console.log('✅ Feed posts query successful');
    }

    // Test equipment query
    const { data: equipmentData, error: equipmentError } = await supabase
      .from('equipment')
      .select('*')
      .limit(1);
    
    if (equipmentError) {
      console.error('❌ Equipment query failed:', equipmentError.message);
    } else {
      console.log('✅ Equipment query successful');
    }

    // Test user bags query (requires auth)
    const { data: bagsData, error: bagsError } = await supabase
      .from('user_bags')
      .select('*')
      .limit(1);
    
    if (bagsError) {
      console.error('❌ User bags query failed:', bagsError.message);
      if (bagsError.message.includes('JWT') || bagsError.message.includes('token')) {
        console.error('   AUTH TOKEN ISSUE!');
      }
    } else {
      console.log('✅ User bags query successful');
    }

    // Check for RLS policy issues
    console.log('\n3️⃣ Checking for RLS policy issues...');
    
    // Try a query that should work for anonymous users
    const { data: publicData, error: publicError } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .limit(1);
    
    if (publicError) {
      console.error('❌ Public query failed - RLS might be too restrictive');
    } else {
      console.log('✅ Public query successful');
    }

    // Check auth state changes
    console.log('\n4️⃣ Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event);
      if (event === 'TOKEN_REFRESHED') {
        console.log('   Token was refreshed');
      } else if (event === 'SIGNED_OUT') {
        console.log('   User signed out');
      } else if (event === 'USER_UPDATED') {
        console.log('   User data updated');
      }
    });

    // Wait a bit to see if any auth events fire
    console.log('   Listening for auth events for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    subscription.unsubscribe();

    console.log('\n📊 Summary:');
    console.log('If queries fail after a few actions, likely causes:');
    console.log('1. JWT token expiry without proper refresh');
    console.log('2. RLS policies checking auth on every request');
    console.log('3. Session state getting out of sync');
    console.log('4. Too many auth checks causing rate limiting');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

debugAuthLoading();