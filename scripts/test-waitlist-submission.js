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

async function testWaitlistSubmission() {
  console.log('🧪 TESTING WAITLIST SUBMISSION FLOW\n');
  console.log('=' .repeat(80));
  
  // Test data for different scoring scenarios
  const testApplications = [
    {
      name: 'High Score User (Auto-approve)',
      data: {
        email: 'highscore@test.com',
        display_name: 'Golf Pro',
        city_region: 'Pebble Beach, CA',
        role: 'content_creator',
        handicap_range: '0-5',
        equipment_interest: ['drivers', 'irons', 'putters'],
        brand_affinity: ['titleist', 'taylormade', 'callaway'],
        purchase_timeline: 'immediately',
        community_involvement: 'very_active',
        referral_source: 'tour_player',
        golf_frequency: 'daily',
        bag_value: '5000+',
        improvement_goals: ['distance', 'accuracy', 'putting'],
        content_types: ['reviews', 'photos', 'discussions'],
        beta_contribution: 'I can provide professional insights and high-quality equipment photos',
        termsAccepted: true,
        contact_phone: '' // Honeypot field
      },
      expectedScore: 95, // Should auto-approve
      expectedStatus: 'approved'
    },
    {
      name: 'Medium Score User (Pending)',
      data: {
        email: 'medium@test.com',
        display_name: 'Weekend Warrior',
        city_region: 'Austin, TX',
        role: 'enthusiast',
        handicap_range: '11-20',
        equipment_interest: ['drivers', 'irons'],
        brand_affinity: ['taylormade', 'ping'],
        purchase_timeline: '3_months',
        community_involvement: 'somewhat_active',
        referral_source: 'social_media',
        golf_frequency: 'weekly',
        bag_value: '2000-3000',
        improvement_goals: ['distance', 'consistency'],
        content_types: ['photos', 'discussions'],
        beta_contribution: 'I love trying new equipment and sharing my experiences',
        termsAccepted: true,
        contact_phone: ''
      },
      expectedScore: 60,
      expectedStatus: 'pending'
    },
    {
      name: 'Low Score User (Pending)',
      data: {
        email: 'casual@test.com',
        display_name: 'Casual Golfer',
        city_region: 'Small Town, USA',
        role: 'casual',
        handicap_range: '21+',
        equipment_interest: ['balls'],
        brand_affinity: [],
        purchase_timeline: 'browsing',
        community_involvement: 'lurker',
        referral_source: 'other',
        golf_frequency: 'monthly',
        bag_value: 'under_1000',
        improvement_goals: [],
        content_types: [],
        beta_contribution: 'Just curious',
        termsAccepted: true,
        contact_phone: ''
      },
      expectedScore: 25,
      expectedStatus: 'pending'
    }
  ];
  
  console.log('\n📝 Submitting test applications...\n');
  
  for (const test of testApplications) {
    console.log(`\nTesting: ${test.name}`);
    console.log(`Expected Score: ~${test.expectedScore}`);
    console.log(`Expected Status: ${test.expectedStatus}`);
    
    try {
      // Calculate score locally for verification
      const scoreBreakdown = calculateScore(test.data);
      console.log(`Calculated Score: ${scoreBreakdown.total}`);
      
      // Check if email already exists in waitlist
      const { data: existing } = await supabase
        .from('waitlist_applications')
        .select('*')
        .eq('email', test.data.email)
        .single();
      
      if (existing) {
        console.log(`⚠️  Application already exists with status: ${existing.status}`);
        continue;
      }
      
      // Submit to waitlist (simulated - in production this would go through API)
      const { data, error } = await supabase
        .from('waitlist_applications')
        .insert({
          email: test.data.email,
          display_name: test.data.display_name,
          city_region: test.data.city_region,
          answers: test.data,
          score: scoreBreakdown.total,
          status: scoreBreakdown.total >= 75 ? 'approved' : 'pending',
          approved_at: scoreBreakdown.total >= 75 ? new Date().toISOString() : null
        })
        .select()
        .single();
      
      if (error) {
        console.log(`❌ Submission failed: ${error.message}`);
      } else {
        console.log(`✅ Application submitted successfully`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Score: ${data.score}`);
        
        // If auto-approved, update profile
        if (data.status === 'approved') {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              email: test.data.email,
              display_name: test.data.display_name,
              beta_access: true,
              invite_quota: 3,
              invites_sent: 0
            }, {
              onConflict: 'email'
            });
          
          if (!profileError) {
            console.log(`   ✅ Profile created with beta access`);
          }
        }
      }
      
    } catch (err) {
      console.log(`❌ Test failed: ${err.message}`);
    }
  }
  
  // Check overall waitlist status
  console.log('\n\n📊 WAITLIST STATUS SUMMARY\n');
  console.log('=' .repeat(80));
  
  const { data: applications, error: appsError } = await supabase
    .from('waitlist_applications')
    .select('status')
    .order('created_at', { ascending: false });
  
  if (!appsError && applications) {
    const approved = applications.filter(a => a.status === 'approved').length;
    const pending = applications.filter(a => a.status === 'pending').length;
    
    console.log(`Total Applications: ${applications.length}`);
    console.log(`Approved: ${approved}`);
    console.log(`Pending: ${pending}`);
  }
  
  // Check beta access status
  const { count: betaCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' })
    .eq('beta_access', true);
  
  const { data: featureFlags } = await supabase
    .from('feature_flags')
    .select('beta_cap')
    .eq('id', 1)
    .single();
  
  console.log(`\nBeta Users: ${betaCount || 0}/${featureFlags?.beta_cap || 150}`);
  console.log(`Spots Remaining: ${Math.max(0, (featureFlags?.beta_cap || 150) - (betaCount || 0))}`);
}

function calculateScore(data) {
  let score = 0;
  const breakdown = {};
  
  // Role scoring
  const roleScores = {
    'content_creator': 20,
    'tour_player': 25,
    'coach': 20,
    'fitter': 20,
    'industry': 15,
    'enthusiast': 10,
    'casual': 5
  };
  score += roleScores[data.role] || 0;
  breakdown.role = roleScores[data.role] || 0;
  
  // Handicap scoring
  const handicapScores = {
    '0-5': 15,
    '6-10': 12,
    '11-20': 8,
    '21+': 5
  };
  score += handicapScores[data.handicap_range] || 0;
  breakdown.handicap = handicapScores[data.handicap_range] || 0;
  
  // Equipment interest (2 points per category)
  score += (data.equipment_interest?.length || 0) * 2;
  breakdown.equipment = (data.equipment_interest?.length || 0) * 2;
  
  // Brand affinity (1 point per brand)
  score += (data.brand_affinity?.length || 0);
  breakdown.brands = (data.brand_affinity?.length || 0);
  
  // Purchase timeline
  const purchaseScores = {
    'immediately': 10,
    '3_months': 7,
    '6_months': 5,
    'browsing': 2
  };
  score += purchaseScores[data.purchase_timeline] || 0;
  breakdown.purchase = purchaseScores[data.purchase_timeline] || 0;
  
  // Community involvement
  const communityScores = {
    'very_active': 15,
    'somewhat_active': 10,
    'occasional': 5,
    'lurker': 2
  };
  score += communityScores[data.community_involvement] || 0;
  breakdown.community = communityScores[data.community_involvement] || 0;
  
  // Referral source bonus
  const referralScores = {
    'tour_player': 10,
    'existing_member': 8,
    'industry_contact': 7,
    'social_media': 3,
    'search': 2,
    'other': 1
  };
  score += referralScores[data.referral_source] || 0;
  breakdown.referral = referralScores[data.referral_source] || 0;
  
  // Additional factors
  if (data.golf_frequency === 'daily') score += 5;
  if (data.golf_frequency === 'weekly') score += 3;
  if (data.bag_value === '5000+') score += 5;
  if (data.bag_value === '3000-5000') score += 3;
  
  breakdown.total = Math.min(score, 100); // Cap at 100
  
  return breakdown;
}

testWaitlistSubmission()
  .then(() => {
    console.log('\n✨ Waitlist submission test complete!');
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
  });