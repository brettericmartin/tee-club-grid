import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create anonymous client (like the frontend uses)
const anonSupabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testAnonSubmission() {
  console.log('=' .repeat(80));
  console.log('TESTING ANONYMOUS SUBMISSION (Frontend Simulation)');
  console.log('=' .repeat(80));
  
  const testData = {
    email: `frontend-test-${Date.now()}@example.com`,
    display_name: 'Frontend Test User',
    city_region: 'San Francisco, CA',
    score: 75,
    status: 'pending',
    answers: {
      role: 'golfer',
      share_channels: ['instagram', 'reddit'],
      learn_channels: ['youtube'],
      spend_bracket: '1500_3000',
      uses: ['discover gear', 'share setup'],
      buy_frequency: 'few_per_year',
      share_frequency: 'monthly',
      termsAccepted: true
    }
  };
  
  console.log('\n📝 Attempting submission with anonymous client...');
  console.log('Data being submitted:', JSON.stringify(testData, null, 2));
  
  const { data, error } = await anonSupabase
    .from('waitlist_applications')
    .insert(testData)
    .select();
  
  if (error) {
    console.log('\n❌ SUBMISSION FAILED');
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
    console.log('Error Details:', error.details);
    console.log('Error Hint:', error.hint);
    
    if (error.code === '42501') {
      console.log('\n🔍 DIAGNOSIS: RLS Policy Blocking Anonymous Insert');
      console.log('The RLS policies are preventing anonymous users from submitting.');
      console.log('This is why the frontend form fails silently.');
    }
  } else {
    console.log('\n✅ SUBMISSION SUCCESSFUL!');
    console.log('Created application:', data);
    
    // Clean up
    const { error: deleteError } = await anonSupabase
      .from('waitlist_applications')
      .delete()
      .eq('email', testData.email);
    
    if (!deleteError) {
      console.log('Test data cleaned up');
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('CONCLUSION:');
  console.log('=' .repeat(80));
  
  if (error) {
    console.log('❌ Anonymous users CANNOT submit waitlist applications');
    console.log('\nREQUIRED FIX:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run this simple fix:\n');
    console.log(`-- Drop all existing policies on waitlist_applications
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'waitlist_applications' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON waitlist_applications', r.policyname);
    END LOOP;
END $$;

-- Create ONE simple policy that works
CREATE POLICY "allow_anonymous_insert"
    ON waitlist_applications
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Grant the permission
GRANT INSERT ON waitlist_applications TO anon;`);
  } else {
    console.log('✅ The system is working! Anonymous users can submit.');
  }
}

testAnonSubmission();