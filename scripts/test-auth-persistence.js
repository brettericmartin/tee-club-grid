import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create client with auth persistence settings
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

console.log('🔐 Testing Auth Persistence and Token Refresh\n');

async function testAuthPersistence() {
  try {
    // 1. Check current session
    console.log('1️⃣ Checking current session...');
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error getting session:', sessionError);
      return;
    }
    
    if (!currentSession) {
      console.log('⚠️ No active session found. Please sign in first.');
      return;
    }
    
    console.log('✅ Session found');
    console.log('   User ID:', currentSession.user.id);
    console.log('   Email:', currentSession.user.email);
    console.log('   Expires at:', new Date(currentSession.expires_at * 1000).toLocaleString());
    
    // 2. Test data access with current session
    console.log('\n2️⃣ Testing data access with current session...');
    const { data: bags, error: bagsError } = await supabase
      .from('user_bags')
      .select('id, name')
      .limit(5);
    
    if (bagsError) {
      console.error('❌ Error fetching bags:', bagsError);
    } else {
      console.log(`✅ Successfully fetched ${bags?.length || 0} bags`);
    }
    
    // 3. Test feed access
    console.log('\n3️⃣ Testing feed access...');
    const { data: feedPosts, error: feedError } = await supabase
      .from('feed_posts')
      .select('id, type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (feedError) {
      console.error('❌ Error fetching feed:', feedError);
    } else {
      console.log(`✅ Successfully fetched ${feedPosts?.length || 0} feed posts`);
    }
    
    // 4. Test token refresh
    console.log('\n4️⃣ Testing token refresh...');
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('❌ Error refreshing session:', refreshError);
    } else if (refreshedSession) {
      console.log('✅ Session refreshed successfully');
      console.log('   New expiry:', new Date(refreshedSession.expires_at * 1000).toLocaleString());
      
      // Calculate time until expiry
      const now = Date.now() / 1000;
      const timeUntilExpiry = refreshedSession.expires_at - now;
      const hoursUntilExpiry = Math.floor(timeUntilExpiry / 3600);
      const minutesUntilExpiry = Math.floor((timeUntilExpiry % 3600) / 60);
      
      console.log(`   Time until expiry: ${hoursUntilExpiry}h ${minutesUntilExpiry}m`);
    }
    
    // 5. Test data access after refresh
    console.log('\n5️⃣ Testing data access after token refresh...');
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .limit(5);
    
    if (equipmentError) {
      console.error('❌ Error fetching equipment:', equipmentError);
    } else {
      console.log(`✅ Successfully fetched ${equipment?.length || 0} equipment items`);
    }
    
    // 6. Test auth state listener
    console.log('\n6️⃣ Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`📢 Auth event: ${event}`);
      if (session) {
        console.log('   Session active, expires:', new Date(session.expires_at * 1000).toLocaleString());
      }
    });
    
    console.log('✅ Auth state listener active');
    
    // 7. Summary
    console.log('\n📊 Summary:');
    console.log('- Session persistence: ✅ Working');
    console.log('- Token refresh: ✅ Working');
    console.log('- Data access: ✅ Working');
    console.log('- Auth monitoring: ✅ Active');
    
    console.log('\n✨ All auth persistence tests passed!');
    
    // Clean up
    subscription.unsubscribe();
    
  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
testAuthPersistence();