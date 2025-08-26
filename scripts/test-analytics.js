#!/usr/bin/env node

/**
 * Analytics Testing Script
 * Test all analytics events and verify tracking
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Mock analytics events for testing
const testEvents = {
  // Waitlist funnel events
  waitlistEvents: [
    {
      event_name: 'waitlist_viewed',
      event_category: 'waitlist',
      properties: {
        referral_code: 'TEST123',
        referrer: 'https://google.com',
        session_id: 'test_session_001'
      }
    },
    {
      event_name: 'waitlist_form_started',
      event_category: 'waitlist',
      properties: {
        first_field: 'email',
        time_to_start_ms: 3500,
        session_id: 'test_session_001'
      }
    },
    {
      event_name: 'waitlist_submitted',
      event_category: 'waitlist',
      properties: {
        email: 'test@example.com',
        score: 8,
        role: 'golfer',
        city_region: 'San Francisco, CA',
        referral_code: 'TEST123',
        form_completion_time: 45000,
        session_id: 'test_session_001'
      }
    },
    {
      event_name: 'waitlist_success_viewed',
      event_category: 'waitlist',
      properties: {
        queue_position: 42,
        referral_code: 'NEWCODE456',
        session_id: 'test_session_001'
      }
    }
  ],
  
  // Referral loop events
  referralEvents: [
    {
      event_name: 'referral_link_generated',
      event_category: 'referral',
      properties: {
        referrer_id: 'user_123',
        referral_code: 'NEWCODE456',
        generation_source: 'waitlist_success'
      }
    },
    {
      event_name: 'referral_link_copied',
      event_category: 'referral',
      properties: {
        referral_code: 'NEWCODE456',
        copy_method: 'button',
        copy_location: 'success_page'
      }
    },
    {
      event_name: 'referral_visit',
      event_category: 'referral',
      properties: {
        referral_code: 'NEWCODE456',
        referrer_id: 'user_123',
        landing_page: '/waitlist',
        session_id: 'test_session_002'
      }
    },
    {
      event_name: 'referral_signup',
      event_category: 'referral',
      properties: {
        referral_code: 'NEWCODE456',
        referrer_id: 'user_123',
        signup_email: 'referred@example.com',
        referral_level: 1,
        time_to_signup_ms: 120000
      }
    }
  ],
  
  // Beta user journey events
  betaEvents: [
    {
      event_name: 'beta_approved',
      event_category: 'beta',
      properties: {
        user_id: 'user_456',
        email: 'test@example.com',
        approval_method: 'manual',
        score: 8,
        referral_count: 3,
        days_in_waitlist: 5
      }
    },
    {
      event_name: 'beta_first_login',
      event_category: 'beta',
      properties: {
        user_id: 'user_456',
        time_since_approval_ms: 3600000,
        login_method: 'email'
      }
    },
    {
      event_name: 'bag_created_first_time',
      event_category: 'bag',
      properties: {
        user_id: 'user_456',
        bag_id: 'bag_789',
        bag_name: 'My First Bag',
        is_public: true,
        is_first_bag: true
      }
    },
    {
      event_name: 'first_post_published',
      event_category: 'social',
      properties: {
        user_id: 'user_456',
        post_id: 'post_001',
        post_type: 'bag_showcase',
        has_media: true,
        is_first_post: true
      }
    }
  ]
};

async function createAnalyticsTable() {
  console.log('📊 Creating analytics_events table if not exists...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        event_name VARCHAR(255) NOT NULL,
        event_category VARCHAR(100),
        properties JSONB,
        session_id VARCHAR(255),
        user_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
    `
  });
  
  if (error) {
    console.log('⚠️  Note: Table might already exist or RPC not available');
    console.log('   You may need to create the table manually using the SQL above');
  } else {
    console.log('✅ Analytics table ready');
  }
}

async function insertTestEvents() {
  console.log('\n📝 Inserting test events...');
  
  const allEvents = [
    ...testEvents.waitlistEvents,
    ...testEvents.referralEvents,
    ...testEvents.betaEvents
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const event of allEvents) {
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        ...event,
        session_id: event.properties?.session_id || `test_session_${Date.now()}`,
        user_id: event.properties?.user_id || null,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.log(`❌ Failed to insert ${event.event_name}:`, error.message);
      errorCount++;
    } else {
      console.log(`✅ Inserted ${event.event_name}`);
      successCount++;
    }
  }
  
  console.log(`\n📊 Results: ${successCount} successful, ${errorCount} failed`);
}

async function verifyEvents() {
  console.log('\n🔍 Verifying inserted events...');
  
  // Count events by category
  const { data: categoryCounts, error: categoryError } = await supabase
    .from('analytics_events')
    .select('event_category')
    .order('event_category');
  
  if (!categoryError && categoryCounts) {
    const counts = categoryCounts.reduce((acc, row) => {
      acc[row.event_category] = (acc[row.event_category] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📈 Events by category:');
    Object.entries(counts).forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });
  }
  
  // Get recent events
  const { data: recentEvents, error: recentError } = await supabase
    .from('analytics_events')
    .select('event_name, event_category, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (!recentError && recentEvents) {
    console.log('\n⏰ Recent events:');
    recentEvents.forEach(event => {
      console.log(`   ${event.event_name} (${event.event_category}) - ${new Date(event.created_at).toLocaleString()}`);
    });
  }
}

async function testFunnelQuery() {
  console.log('\n🔬 Testing funnel conversion query...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      WITH funnel_stages AS (
        SELECT
          COUNT(DISTINCT session_id) FILTER (WHERE event_name = 'waitlist_viewed') as visitors,
          COUNT(DISTINCT properties->>'email') FILTER (WHERE event_name = 'waitlist_submitted') as submitted,
          COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'beta_approved') as approved,
          COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'beta_first_login') as activated
        FROM analytics_events
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
      )
      SELECT * FROM funnel_stages;
    `
  });
  
  if (error) {
    console.log('⚠️  Could not run funnel query via RPC');
    console.log('   Run the query manually to test funnel metrics');
  } else if (data && data.length > 0) {
    console.log('📊 Funnel metrics:', data[0]);
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  const { error } = await supabase
    .from('analytics_events')
    .delete()
    .like('session_id', 'test_session_%');
  
  if (error) {
    console.log('⚠️  Could not clean up test data:', error.message);
  } else {
    console.log('✅ Test data cleaned up');
  }
}

// Main execution
async function main() {
  console.log('🚀 Analytics Testing Script');
  console.log('===========================\n');
  
  try {
    // Create table if needed
    await createAnalyticsTable();
    
    // Insert test events
    await insertTestEvents();
    
    // Verify events were inserted
    await verifyEvents();
    
    // Test funnel query
    await testFunnelQuery();
    
    // Optionally cleanup
    const shouldCleanup = process.argv.includes('--cleanup');
    if (shouldCleanup) {
      await cleanup();
    } else {
      console.log('\n💡 Tip: Run with --cleanup flag to remove test data');
    }
    
    console.log('\n✨ Analytics testing complete!');
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error);
    process.exit(1);
  }
}

// Run the script
main();