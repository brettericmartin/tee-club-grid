import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Development helper to manually submit a waitlist application
 * Since the API endpoints aren't running locally
 */
async function submitWaitlistApplication(email, displayName, cityRegion) {
  console.log('📝 Submitting waitlist application...\n');
  
  // Calculate a basic score (simplified version)
  const score = 65; // Medium score for testing
  
  const application = {
    email: email.toLowerCase(),
    display_name: displayName,
    city_region: cityRegion,
    score,
    status: score >= 75 ? 'approved' : 'pending',
    answers: {
      role: 'enthusiast',
      handicap_range: '11-20',
      test_submission: true
    }
  };
  
  try {
    // Check if application already exists
    const { data: existing } = await supabase
      .from('waitlist_applications')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (existing) {
      console.log(`⚠️  Application already exists for ${email}`);
      console.log(`   Status: ${existing.status}`);
      console.log(`   Score: ${existing.score}`);
      return existing;
    }
    
    // Create new application
    const { data, error } = await supabase
      .from('waitlist_applications')
      .insert(application)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error:', error.message);
      return null;
    }
    
    console.log('✅ Application submitted successfully!');
    console.log(`   Email: ${data.email}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Score: ${data.score}`);
    
    // If auto-approved, grant beta access
    if (data.status === 'approved') {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          email: email.toLowerCase(),
          display_name: displayName,
          beta_access: true,
          invite_quota: 3,
          referral_code: Math.random().toString(36).substring(2, 10)
        }, {
          onConflict: 'email'
        });
      
      if (!profileError) {
        console.log('   ✅ Beta access granted!');
      }
    }
    
    return data;
  } catch (err) {
    console.error('❌ Error:', err.message);
    return null;
  }
}

// Get command line arguments or use defaults
const args = process.argv.slice(2);
const email = args[0] || 'test@test.com';
const displayName = args[1] || 'Test User';
const cityRegion = args[2] || 'Test City, TC';

submitWaitlistApplication(email, displayName, cityRegion)
  .then(() => {
    console.log('\n✨ Done!');
    console.log('\n📋 View in admin dashboard: http://localhost:3334/admin');
  });