import { supabase } from './supabase-admin.js';

async function createTestEntries() {
  console.log('🎯 CREATING TEST WAITLIST ENTRIES FOR ADMIN DASHBOARD TESTING');
  console.log('=' .repeat(80));
  
  const testApplications = [
    {
      email: 'john.doe@example.com',
      display_name: 'John Doe',
      city_region: 'New York, NY',
      status: 'pending',
      answers: {
        golf_experience: '10 years',
        favorite_clubs: 'TaylorMade Stealth 2',
        why_interested: 'Love tracking my equipment'
      },
      score: 85
    },
    {
      email: 'jane.smith@example.com', 
      display_name: 'Jane Smith',
      city_region: 'Los Angeles, CA',
      status: 'pending',
      answers: {
        golf_experience: '5 years',
        favorite_clubs: 'Callaway Paradym',
        why_interested: 'Want to share my golf journey'
      },
      score: 78
    },
    {
      email: 'mike.wilson@example.com',
      display_name: 'Mike Wilson',
      city_region: 'Chicago, IL',
      status: 'pending',
      answers: {
        golf_experience: '15 years',
        favorite_clubs: 'Ping G430',
        why_interested: 'Connect with other golfers'
      },
      score: 92
    }
  ];
  
  console.log('\n📝 Creating test applications...\n');
  
  for (const app of testApplications) {
    // Check if already exists
    const { data: existing, error: checkError } = await supabase
      .from('waitlist_applications')
      .select('id, status')
      .eq('email', app.email)
      .single();
    
    if (existing) {
      console.log(`⚠️  ${app.email} already exists (status: ${existing.status})`);
      
      // Reset to pending if approved
      if (existing.status === 'approved') {
        const { error: resetError } = await supabase
          .from('waitlist_applications')
          .update({ status: 'pending', approved_at: null })
          .eq('id', existing.id);
        
        if (!resetError) {
          console.log(`   ↻ Reset to pending status`);
        }
      }
    } else {
      // Create new application
      const { data: newApp, error: createError } = await supabase
        .from('waitlist_applications')
        .insert(app)
        .select()
        .single();
      
      if (createError) {
        console.error(`❌ Error creating ${app.email}:`, createError.message);
      } else {
        console.log(`✅ Created application for ${app.display_name} (${app.email})`);
      }
    }
  }
  
  // Show summary
  console.log('\n📊 WAITLIST SUMMARY');
  console.log('-'.repeat(40));
  
  const { data: allApps, error: fetchError } = await supabase
    .from('waitlist_applications')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (allApps) {
    const pending = allApps.filter(a => a.status === 'pending');
    const approved = allApps.filter(a => a.status === 'approved');
    
    console.log(`Total applications: ${allApps.length}`);
    console.log(`Pending: ${pending.length}`);
    console.log(`Approved: ${approved.length}`);
    
    if (pending.length > 0) {
      console.log('\nPending applications ready for testing:');
      pending.forEach(app => {
        console.log(`  • ${app.display_name || 'No name'} - ${app.email}`);
      });
    }
  }
  
  console.log('\n✨ Test data ready!');
  console.log('\n📝 Next steps:');
  console.log('1. Open the admin dashboard at http://localhost:3333/admin/waitlist');
  console.log('2. You should see the pending applications');
  console.log('3. Try approving them using the "Approve" button');
  console.log('4. Check the console for any errors');
}

createTestEntries()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });