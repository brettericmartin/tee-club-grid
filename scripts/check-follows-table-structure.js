import { supabase } from './supabase-admin.js';

console.log('🔍 CHECKING FOLLOWS TABLE STRUCTURE');
console.log('==================================');

async function checkFollowsTable() {

  try {
    // 1. Check if follows table exists and its structure
    console.log('\n1. CHECKING TABLE STRUCTURE...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('follows')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ No "follows" table found. Let me check for other table names...');
      
      // Check for alternative table names
      const possibleNames = ['user_follows', 'follow', 'user_follow', 'follows'];
      for (const tableName of possibleNames) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!error) {
            console.log(`✅ Found table: ${tableName}`);
            console.log('Sample data:', data);
            
            // Get table schema
            const { data: schema } = await supabase
              .rpc('get_table_schema', { table_name: tableName })
              .single();
            
            if (schema) {
              console.log('Table schema:', schema);
            }
            break;
          }
        } catch (e) {
          console.log(`❌ Table ${tableName} not found`);
        }
      }
    } else {
      console.log('✅ "follows" table exists');
      console.log('Sample data:', tableInfo);
    }

    // 2. Check RLS status
    console.log('\n2. CHECKING RLS STATUS...');
    try {
      const { data: rlsStatus } = await supabase
        .from('information_schema.tables')
        .select('table_name, row_security')
        .eq('table_name', 'follows')
        .eq('table_schema', 'public')
        .single();
      
      console.log('RLS enabled:', rlsStatus);
    } catch (e) {
      console.log('Could not check RLS status');
    }

    // 3. Test follow query
    console.log('\n3. TESTING FOLLOW QUERIES...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('user_follows')
        .select('*')
        .limit(5);
      
      if (testError) {
        console.log('❌ Test query failed:', testError.message);
      } else {
        console.log('✅ Test query successful. Found', testData.length, 'follows');
        if (testData.length > 0) {
          console.log('Sample follow data:', testData[0]);
        }
      }
    } catch (e) {
      console.log('❌ Test query error:', e.message);
    }

    // 4. Check current user's follows
    console.log('\n4. CHECKING FOR ACTUAL FOLLOWS DATA...');
    try {
      const { data: followsData, error: followsError } = await supabase
        .from('user_follows')
        .select('follower_id, following_id, created_at')
        .limit(10);
      
      if (followsError) {
        console.log('❌ Error checking follows:', followsError.message);
      } else {
        console.log(`✅ Found ${followsData.length} follow relationships`);
        followsData.forEach((follow, index) => {
          console.log(`  ${index + 1}. ${follow.follower_id} follows ${follow.following_id}`);
        });
      }
    } catch (e) {
      console.log('❌ Error:', e.message);
    }

  } catch (error) {
    console.error('❌ General error:', error);
  }
}

checkFollowsTable();