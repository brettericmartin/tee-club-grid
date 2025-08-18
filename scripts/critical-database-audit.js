#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

console.log('🚨 CRITICAL DATABASE AUDIT - Equipment Loading Issues');
console.log('=====================================================\n');

async function auditDatabase() {
  try {
    console.log('1. CHECKING CORE TABLES...\n');
    
    // Check critical tables exist and have data
    const criticalTables = [
      'profiles',
      'equipment', 
      'user_bags',
      'bag_equipment',
      'equipment_photos'
    ];
    
    for (const table of criticalTables) {
      console.log(`Checking table: ${table}`);
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`  ❌ ERROR: ${error.message}`);
          console.log(`  ❌ Code: ${error.code}`);
          console.log(`  ❌ Details: ${error.details}`);
        } else {
          console.log(`  ✅ EXISTS: ${count} rows`);
        }
      } catch (e) {
        console.log(`  ❌ EXCEPTION: ${e.message}`);
      }
      console.log('');
    }

    console.log('\n2. CHECKING RLS POLICIES...\n');
    
    // Check RLS policies exist
    for (const table of criticalTables) {
      console.log(`Checking RLS policies for: ${table}`);
      try {
        const { data, error } = await supabase.rpc('get_policies', {
          table_name: table
        });
        
        if (error) {
          // Try alternative query
          const { data: policies, error: policyError } = await supabase
            .from('pg_policies')
            .select('*')
            .eq('tablename', table);
            
          if (policyError) {
            console.log(`  ❌ Cannot check policies: ${policyError.message}`);
          } else {
            console.log(`  ✅ Found ${policies?.length || 0} policies`);
            policies?.forEach(policy => {
              console.log(`    - ${policy.policyname}: ${policy.cmd} for ${policy.roles}`);
            });
          }
        } else {
          console.log(`  ✅ Found ${data?.length || 0} policies`);
        }
      } catch (e) {
        console.log(`  ⚠️  Could not check policies: ${e.message}`);
      }
      console.log('');
    }

    console.log('\n3. TESTING EQUIPMENT QUERIES...\n');
    
    // Test the specific query that MyBagSupabase makes
    console.log('Testing equipment query that frontend uses...');
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .limit(5);
        
      if (error) {
        console.log(`❌ EQUIPMENT QUERY FAILED: ${error.message}`);
        console.log(`Code: ${error.code}`);
        console.log(`Details: ${error.details}`);
        console.log(`Hint: ${error.hint}`);
      } else {
        console.log(`✅ Equipment query works: ${data?.length || 0} items returned`);
        if (data && data.length > 0) {
          console.log(`  Sample: ${data[0].brand} ${data[0].model} (${data[0].category})`);
        }
      }
    } catch (e) {
      console.log(`❌ EQUIPMENT QUERY EXCEPTION: ${e.message}`);
    }

    console.log('\n4. TESTING BAG EQUIPMENT JOIN QUERY...\n');
    
    // Test the bag equipment query with joins
    console.log('Testing bag equipment query with joins...');
    try {
      const { data, error } = await supabase
        .from('bag_equipment')
        .select(`
          *,
          equipment(
            *,
            equipment_photos (
              id,
              photo_url,
              likes_count,
              is_primary
            )
          )
        `)
        .limit(3);
        
      if (error) {
        console.log(`❌ BAG EQUIPMENT JOIN FAILED: ${error.message}`);
        console.log(`Code: ${error.code}`);
        console.log(`Details: ${error.details}`);
      } else {
        console.log(`✅ Bag equipment join works: ${data?.length || 0} items returned`);
        if (data && data.length > 0) {
          const item = data[0];
          console.log(`  Sample: Bag ${item.bag_id} has ${item.equipment?.brand} ${item.equipment?.model}`);
          console.log(`  Photos: ${item.equipment?.equipment_photos?.length || 0}`);
        }
      }
    } catch (e) {
      console.log(`❌ BAG EQUIPMENT JOIN EXCEPTION: ${e.message}`);
    }

    console.log('\n5. CHECKING USER BAGS...\n');
    
    // Check if user bags exist
    try {
      const { data, error } = await supabase
        .from('user_bags')
        .select('*')
        .limit(5);
        
      if (error) {
        console.log(`❌ USER BAGS QUERY FAILED: ${error.message}`);
      } else {
        console.log(`✅ User bags query works: ${data?.length || 0} bags found`);
        if (data && data.length > 0) {
          console.log(`  Sample: "${data[0].name}" by user ${data[0].user_id}`);
        }
      }
    } catch (e) {
      console.log(`❌ USER BAGS EXCEPTION: ${e.message}`);
    }

    console.log('\n6. CHECKING FOREIGN KEY CONSTRAINTS...\n');
    
    // Check foreign key constraints
    try {
      const { data, error } = await supabase.rpc('check_foreign_keys', {});
      
      if (error) {
        console.log(`⚠️  Cannot check foreign keys via RPC: ${error.message}`);
        // Try manual check
        console.log('Checking bag_equipment -> equipment relationship...');
        
        const { data: orphaned, error: orphanError } = await supabase
          .from('bag_equipment')
          .select('equipment_id')
          .not('equipment_id', 'in', 
            await supabase.from('equipment').select('id').then(r => r.data?.map(e => e.id) || [])
          );
          
        if (orphanError) {
          console.log(`❌ Cannot check orphaned references: ${orphanError.message}`);
        } else {
          console.log(`${orphaned?.length || 0} orphaned bag_equipment records found`);
        }
      } else {
        console.log(`✅ Foreign key constraints check completed`);
      }
    } catch (e) {
      console.log(`⚠️  Foreign key check failed: ${e.message}`);
    }

    console.log('\n7. CHECKING AUTHENTICATION STATE...\n');
    
    // Check auth session
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log(`❌ Auth session check failed: ${error.message}`);
      } else if (session) {
        console.log(`✅ Auth session active for user: ${session.user.id}`);
      } else {
        console.log(`⚠️  No active auth session (service key mode)`);
      }
    } catch (e) {
      console.log(`❌ Auth check exception: ${e.message}`);
    }

    console.log('\n8. FINAL DIAGNOSIS...\n');
    
    // Try to replicate the exact issue
    console.log('Attempting to replicate the frontend loading issue...');
    
    // Simulate what MyBagSupabase.tsx does
    try {
      // 1. Check if we can load user bags
      const { data: bags, error: bagsError } = await supabase
        .from('user_bags')
        .select('*')
        .limit(1);
        
      if (bagsError) {
        console.log(`❌ Step 1 (load bags) failed: ${bagsError.message}`);
        return;
      }
      
      if (!bags || bags.length === 0) {
        console.log(`⚠️  Step 1: No bags found - this might be expected`);
        return;
      }
      
      console.log(`✅ Step 1: Found bag "${bags[0].name}"`);
      
      // 2. Try to load equipment for that bag
      const { data: equipment, error: equipError } = await supabase
        .from('bag_equipment')
        .select(`
          *,
          equipment(
            *,
            equipment_photos (
              id,
              photo_url,
              likes_count,
              is_primary
            )
          )
        `)
        .eq('bag_id', bags[0].id);
        
      if (equipError) {
        console.log(`❌ Step 2 (load equipment) failed: ${equipError.message}`);
        console.log(`   This is likely the root cause of the issue!`);
        
        // Try simpler query
        const { data: simpleEquip, error: simpleError } = await supabase
          .from('bag_equipment')
          .select('*')
          .eq('bag_id', bags[0].id);
          
        if (simpleError) {
          console.log(`❌ Even simple bag_equipment query failed: ${simpleError.message}`);
        } else {
          console.log(`✅ Simple query works: ${simpleEquip?.length || 0} items`);
          console.log(`   Issue is likely with the JOIN to equipment table`);
        }
      } else {
        console.log(`✅ Step 2: Loaded ${equipment?.length || 0} equipment items`);
      }
      
    } catch (e) {
      console.log(`❌ Replication attempt failed: ${e.message}`);
    }

  } catch (error) {
    console.error('❌ CRITICAL ERROR during audit:', error);
  }
}

// Run the audit
auditDatabase().then(() => {
  console.log('\n🔍 AUDIT COMPLETE');
  console.log('If you see any ❌ errors above, those need to be fixed immediately.');
  process.exit(0);
}).catch(error => {
  console.error('💥 AUDIT CRASHED:', error);
  process.exit(1);
});