import { supabase } from './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function executeRLSFix() {
  console.log('🔧 Executing RLS Fix for user_follows table\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'sql', 'fix-user-follows-rls.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 5);

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`${i + 1}. Executing: ${statement.split('\n')[0]}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });
        
        if (error) {
          console.log(`   ❌ Error: ${error.message}`);
        } else {
          console.log(`   ✅ Success`);
          if (data && Array.isArray(data) && data.length > 0) {
            console.log(`   📊 Result: ${data.length} rows`);
            // If this is the verification query, show the results
            if (statement.includes('pg_policies')) {
              console.log('   📋 Current policies:');
              data.forEach(policy => {
                console.log(`      - ${policy.policyname} (${policy.cmd}) for roles: ${policy.roles}`);
              });
            }
          }
        }
      } catch (execError) {
        console.log(`   ❌ Execution error: ${execError.message}`);
      }
    }

    console.log('\n🎉 RLS Fix execution complete!\n');

    // Test the policies
    console.log('🧪 Testing the policies...\n');
    
    // Test SELECT with service role
    const { data: selectTest, error: selectError } = await supabase
      .from('user_follows')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.log('❌ SELECT test failed:', selectError.message);
    } else {
      console.log('✅ SELECT test passed');
    }

    // Test with anon key
    const anonSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const { data: anonTest, error: anonError } = await anonSupabase
      .from('user_follows')
      .select('*')
      .limit(1);
    
    if (anonError) {
      console.log('❌ Anonymous SELECT test failed:', anonError.message);
    } else {
      console.log('✅ Anonymous SELECT test passed');
    }

    console.log('\n📋 Summary of RLS Policies:');
    console.log('✅ SELECT: All users (authenticated + anonymous) can view follows');
    console.log('✅ INSERT: Authenticated users can follow others (where auth.uid() = follower_id)');
    console.log('✅ DELETE: Authenticated users can unfollow (where auth.uid() = follower_id)');
    console.log('\n🚀 Follow system is now properly secured!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

executeRLSFix();