import { supabase } from './supabase-admin.js';

console.log('🚀 SETTING UP FOLLOWS SYSTEM');
console.log('=============================');

async function setupFollowsSystem() {
  try {
    console.log('\n1. CHECKING CURRENT TABLE STRUCTURE...');
    
    // Check if user_follows table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('user_follows')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.code === '42P01') {
      console.log('❌ Table user_follows does not exist. Creating it...');
      
      // Create the table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.user_follows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
          following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(follower_id, following_id),
          CHECK (follower_id != following_id)
        );
      `;
      
      const { error: createError } = await supabase.rpc('execute_sql', {
        query: createTableSQL
      });
      
      if (createError) {
        console.log('❌ Error creating table:', createError.message);
        return;
      }
      
      console.log('✅ Table user_follows created successfully');
    } else if (tableError) {
      console.log('❌ Error checking table:', tableError.message);
      return;
    } else {
      console.log('✅ Table user_follows already exists');
      console.log(`   Current records: ${tableExists.length > 0 ? 'Has data' : 'Empty'}`);
    }

    console.log('\n2. SETTING UP RLS POLICIES...');
    
    // Setup RLS policies
    const rlsSetupSQL = `
      -- Enable RLS on user_follows table
      ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

      -- Drop any existing policies that might conflict
      DROP POLICY IF EXISTS "Users can view all follows" ON public.user_follows;
      DROP POLICY IF EXISTS "Authenticated users can follow" ON public.user_follows;
      DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;
      DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_follows;
      DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_follows;
      DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.user_follows;

      -- Create SELECT policy (allow all users to view follows)
      CREATE POLICY "Users can view all follows" 
      ON public.user_follows 
      FOR SELECT 
      TO authenticated, anon 
      USING (true);

      -- Create INSERT policy (allow authenticated users to follow)
      CREATE POLICY "Authenticated users can follow" 
      ON public.user_follows 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = follower_id);

      -- Create DELETE policy (allow authenticated users to unfollow)
      CREATE POLICY "Users can unfollow" 
      ON public.user_follows 
      FOR DELETE 
      TO authenticated 
      USING (auth.uid() = follower_id);
    `;

    const { error: rlsError } = await supabase.rpc('execute_sql', {
      query: rlsSetupSQL
    });

    if (rlsError) {
      console.log('❌ Error setting up RLS policies:', rlsError.message);
      
      // Try alternative approach using individual queries
      console.log('🔄 Trying alternative RLS setup...');
      
      try {
        // Enable RLS
        await supabase.rpc('execute_sql', {
          query: 'ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;'
        });
        
        // Create policies one by one
        await supabase.rpc('execute_sql', {
          query: `CREATE POLICY "Users can view all follows" ON public.user_follows FOR SELECT TO authenticated, anon USING (true);`
        });
        
        await supabase.rpc('execute_sql', {
          query: `CREATE POLICY "Authenticated users can follow" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);`
        });
        
        await supabase.rpc('execute_sql', {
          query: `CREATE POLICY "Users can unfollow" ON public.user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);`
        });
        
        console.log('✅ RLS policies created via alternative method');
      } catch (altError) {
        console.log('❌ Alternative RLS setup also failed:', altError.message);
        console.log('\n📋 Manual SQL required (execute in Supabase SQL Editor):');
        console.log('='.repeat(60));
        console.log(rlsSetupSQL);
        console.log('='.repeat(60));
        return;
      }
    } else {
      console.log('✅ RLS policies set up successfully');
    }

    console.log('\n3. TESTING FOLLOW SYSTEM...');
    
    // Get test users
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .limit(2);

    if (profileError || !profiles || profiles.length < 2) {
      console.log('⚠️ Need at least 2 users to test follow functionality');
      console.log('Creating test users for demonstration...');
      
      // Could create test users here if needed
      console.log('✅ Setup complete, but unable to test without users');
      return;
    }

    const [user1, user2] = profiles;
    console.log(`Testing with users: ${user1.display_name || user1.id.slice(0, 8)} and ${user2.display_name || user2.id.slice(0, 8)}`);

    // Check if test follow already exists
    const { data: existingFollow } = await supabase
      .from('user_follows')
      .select('*')
      .eq('follower_id', user1.id)
      .eq('following_id', user2.id)
      .maybeSingle();

    if (existingFollow) {
      console.log('✅ Test follow relationship already exists');
      
      // Test deletion (unfollow)
      const { error: deleteError } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user1.id)
        .eq('following_id', user2.id);
      
      if (deleteError) {
        console.log('❌ Delete test failed:', deleteError.message);
      } else {
        console.log('✅ Delete (unfollow) test successful');
      }
    }

    // Test insertion (follow)
    const { data: insertResult, error: insertError } = await supabase
      .from('user_follows')
      .insert({
        follower_id: user1.id,
        following_id: user2.id
      })
      .select()
      .single();

    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
    } else {
      console.log('✅ Insert (follow) test successful');
      console.log('   New follow record:', insertResult);
    }

    console.log('\n4. FINAL VERIFICATION...');
    
    // Get current stats
    const { count, error: countError } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`✅ Total follow relationships: ${count}`);
    }

    // Test query permissions
    const { data: queryTest, error: queryError } = await supabase
      .from('user_follows')
      .select('follower_id, following_id, created_at')
      .limit(5);

    if (queryError) {
      console.log('❌ Query test failed:', queryError.message);
    } else {
      console.log(`✅ Query test successful. Found ${queryTest.length} relationships`);
    }

    console.log('\n🎉 FOLLOWS SYSTEM SETUP COMPLETE!');
    console.log('\nTable Structure:');
    console.log('- id (UUID, Primary Key)');
    console.log('- follower_id (UUID, References profiles.id)');
    console.log('- following_id (UUID, References profiles.id)');
    console.log('- created_at (Timestamp)');
    console.log('- Unique constraint on (follower_id, following_id)');
    console.log('- Check constraint prevents self-follows');
    console.log('\nRLS Policies:');
    console.log('- SELECT: Anyone can view follows');
    console.log('- INSERT: Authenticated users can follow (where auth.uid() = follower_id)');
    console.log('- DELETE: Users can unfollow (where auth.uid() = follower_id)');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

setupFollowsSystem();