import './supabase-admin.mjs';

async function testSimpleFeedQuery() {
  const userId = '38c167c1-d10a-406d-9b9d-c86292739ccd'; // brettmartinplay
  
  console.log('Testing simple feed query for user:', userId);
  
  // 1. Test basic query
  const { data: basicData, error: basicError } = await supabase
    .from('feed_posts')
    .select('*')
    .eq('user_id', userId)
    .limit(5);
  
  console.log('\n1. Basic query (no joins):');
  console.log('Error:', basicError);
  console.log('Posts returned:', basicData?.length || 0);
  
  // 2. Test with profile join
  const { data: profileData, error: profileError } = await supabase
    .from('feed_posts')
    .select(`
      *,
      profile:profiles!feed_posts_user_id_fkey(*)
    `)
    .eq('user_id', userId)
    .limit(5);
  
  console.log('\n2. With profile join:');
  console.log('Error:', profileError);
  console.log('Posts returned:', profileData?.length || 0);
  if (profileData?.[0]) {
    console.log('Profile exists:', !!profileData[0].profile);
  }
  
  // 3. Test full query
  const { data: fullData, error: fullError } = await supabase
    .from('feed_posts')
    .select(`
      *,
      profile:profiles!feed_posts_user_id_fkey(
        username,
        avatar_url,
        handicap
      ),
      equipment:equipment(
        id,
        brand,
        model,
        category,
        image_url
      ),
      bag:user_bags(
        id,
        name,
        description,
        background
      )
    `)
    .eq('user_id', userId)
    .limit(5);
  
  console.log('\n3. Full query with all joins:');
  console.log('Error:', fullError);
  console.log('Posts returned:', fullData?.length || 0);
  
  if (fullData?.[0]) {
    console.log('\nFirst post structure:');
    console.log('- ID:', fullData[0].id);
    console.log('- Type:', fullData[0].type);
    console.log('- Has profile:', !!fullData[0].profile);
    console.log('- Has equipment:', !!fullData[0].equipment);
    console.log('- Has bag:', !!fullData[0].bag);
    console.log('- Media URLs:', fullData[0].media_urls);
  }
}

testSimpleFeedQuery();