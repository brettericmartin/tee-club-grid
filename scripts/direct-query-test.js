import './supabase-admin.mjs';

async function directQueryTest() {
  console.log('=== DIRECT QUERY TEST ===\n');
  
  // Test 1: Direct SQL query for users
  console.log('1. Testing direct auth.users access...');
  try {
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(5);
    
    if (authError) {
      console.log('Cannot access auth.users directly (this is normal)');
      console.log('Error:', authError.message);
    } else {
      console.log('Auth users found:', authUsers?.length || 0);
    }
  } catch (e) {
    console.log('Auth query failed:', e.message);
  }
  
  // Test 2: Check profiles table directly
  console.log('\n2. Testing profiles table...');
  const { data: profiles, error: profilesError, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' });
  
  if (profilesError) {
    console.error('Profiles error:', profilesError);
  } else {
    console.log(`Total profiles: ${count}`);
    if (profiles && profiles.length > 0) {
      console.log('\nSample profiles:');
      profiles.slice(0, 3).forEach(p => {
        console.log(`- ${p.username || 'No username'} (${p.id})`);
      });
    }
  }
  
  // Test 3: Check feed_posts with user info
  console.log('\n3. Testing feed_posts with users...');
  const { data: postsWithUsers, error: postsError } = await supabase
    .from('feed_posts')
    .select(`
      id,
      type,
      user_id,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (postsError) {
    console.error('Posts error:', postsError);
  } else {
    console.log('Recent posts:');
    postsWithUsers?.forEach(post => {
      console.log(`- ${post.type} by ${post.user_id} at ${post.created_at}`);
    });
  }
  
  // Test 4: Get unique user IDs from feed_posts
  console.log('\n4. Unique users who have posted...');
  const { data: allPosts } = await supabase
    .from('feed_posts')
    .select('user_id');
  
  if (allPosts) {
    const uniqueUserIds = [...new Set(allPosts.map(p => p.user_id))];
    console.log(`Found ${uniqueUserIds.length} unique users with posts`);
    uniqueUserIds.slice(0, 3).forEach(id => {
      const postCount = allPosts.filter(p => p.user_id === id).length;
      console.log(`- User ${id}: ${postCount} posts`);
    });
  }
}

directQueryTest();