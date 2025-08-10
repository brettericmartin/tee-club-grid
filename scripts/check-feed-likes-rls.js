#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function checkFeedLikesRLS() {
  console.log('🔍 Checking feed_likes table and RLS policies...\n');

  try {
    // 1. Check if table exists and structure
    console.log('1️⃣ Checking table structure...');
    const { data: sample, error: sampleError } = await supabase
      .from('feed_likes')
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.error('Error accessing feed_likes:', sampleError);
      return;
    }
    
    if (sample && sample.length > 0) {
      console.log('Table columns:', Object.keys(sample[0]).join(', '));
    }
    
    // 2. Try to check RLS policies using a raw query
    console.log('\n2️⃣ Checking RLS policies...');
    try {
      const { data: rlsCheck } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT schemaname, tablename, hasrls 
          FROM pg_tables 
          WHERE tablename = 'feed_likes' AND schemaname = 'public';
        `
      });
      
      if (rlsCheck && rlsCheck.length > 0) {
        console.log('RLS enabled:', rlsCheck[0].hasrls ? 'YES' : 'NO');
      }
    } catch (e) {
      console.log('Could not check RLS status via SQL');
    }
    
    // 3. Check if we can query policies
    console.log('\n3️⃣ Attempting to check policies...');
    try {
      const { data: policies } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT pol.polname, pol.polcmd, pol.polroles::regrole[], pol.polqual::text, pol.polwithcheck::text
          FROM pg_policy pol
          JOIN pg_class pc ON pol.polrelid = pc.oid
          JOIN pg_namespace pn ON pc.relnamespace = pn.oid
          WHERE pc.relname = 'feed_likes' AND pn.nspname = 'public';
        `
      });
      
      if (policies && policies.length > 0) {
        console.log(`Found ${policies.length} policies:`);
        policies.forEach(p => {
          console.log(`  - ${p.polname} (${p.polcmd})`);
        });
      } else {
        console.log('No policies found for feed_likes table');
      }
    } catch (e) {
      console.log('Could not query policies directly');
    }
    
    // 4. Test actual operations
    console.log('\n4️⃣ Testing operations...');
    
    // Get a test user and post
    const { data: testUser } = await supabase
      .from('profiles') 
      .select('id')
      .limit(1)
      .single();
      
    const { data: testPost } = await supabase
      .from('feed_posts')
      .select('id')
      .limit(1)
      .single();
      
    if (testUser && testPost) {
      console.log('Test user:', testUser.id.substring(0, 8) + '...');
      console.log('Test post:', testPost.id.substring(0, 8) + '...');
      
      // Check if already liked
      const { data: existing, error: checkError } = await supabase
        .from('feed_likes')
        .select('id')
        .eq('user_id', testUser.id)
        .eq('post_id', testPost.id)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking existing like:', checkError);
      } else {
        console.log('Existing like found:', existing ? 'YES' : 'NO');
      }
    }
    
    // 5. Check for any constraints
    console.log('\n5️⃣ Checking constraints...');
    try {
      const { data: constraints } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT conname, contype, pg_get_constraintdef(oid) as definition
          FROM pg_constraint
          WHERE conrelid = 'public.feed_likes'::regclass;
        `
      });
      
      if (constraints) {
        console.log(`Found ${constraints.length} constraints`);
        constraints.forEach(c => {
          console.log(`  - ${c.conname}: ${c.definition}`);
        });
      }
    } catch (e) {
      console.log('Could not check constraints');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkFeedLikesRLS()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });