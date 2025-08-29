import { supabase } from './supabase-admin.js';

async function checkTablesAndViews() {
  console.log('🔍 CHECKING TABLES VS VIEWS IN DATABASE');
  console.log('=' .repeat(80));
  
  try {
    // Query to distinguish tables from views
    const { data, error } = await supabase.rpc('run_sql', {
      query: `
        SELECT 
          c.relname AS object_name,
          CASE 
            WHEN c.relkind = 'r' THEN 'TABLE'
            WHEN c.relkind = 'v' THEN 'VIEW'
            WHEN c.relkind = 'm' THEN 'MATERIALIZED VIEW'
            ELSE 'OTHER'
          END AS object_type,
          c.relrowsecurity AS has_rls,
          COUNT(p.polname) AS policy_count
        FROM pg_class c
        LEFT JOIN pg_policy p ON p.polrelid = c.oid
        WHERE c.relnamespace = 'public'::regnamespace
          AND c.relkind IN ('r', 'v', 'm')
        GROUP BY c.relname, c.relkind, c.relrowsecurity
        ORDER BY c.relkind, c.relname;
      `
    });

    if (error) {
      // Try alternative method
      console.log('Direct SQL query not available, checking manually...\n');
      
      const objectsToCheck = [
        'profiles', 'user_bags', 'bag_equipment', 'equipment_photos',
        'feed_posts', 'feed_likes', 'user_follows', 'waitlist_applications',
        'admins', 'equipment_saves', 'equipment_reports', 'user_badges'
      ];
      
      console.log('Object Name                    | Type     | Can Query | Can Insert');
      console.log('-'.repeat(70));
      
      for (const obj of objectsToCheck) {
        let type = 'UNKNOWN';
        let canQuery = false;
        let canInsert = false;
        
        // Test SELECT
        const { error: selectError } = await supabase
          .from(obj)
          .select('*')
          .limit(0);
        
        canQuery = !selectError;
        
        // Test INSERT (dry run)
        const { error: insertError } = await supabase
          .from(obj)
          .insert({ test: 'test' })
          .select()
          .limit(0);
        
        // If insert gets "cannot insert into view" error, it's a view
        if (insertError) {
          if (insertError.message.includes('cannot insert into view') || 
              insertError.message.includes('cannot be performed on relation')) {
            type = 'VIEW';
          } else if (insertError.message.includes('violates row-level security') ||
                     insertError.message.includes('permission denied') ||
                     insertError.message.includes('invalid input')) {
            type = 'TABLE';
          }
        } else {
          type = 'TABLE';
        }
        
        canInsert = !insertError || 
                   (insertError.message.includes('violates row-level security') ||
                    insertError.message.includes('invalid input'));
        
        console.log(`${obj.padEnd(30)} | ${type.padEnd(8)} | ${canQuery ? 'Yes' : 'No  '}      | ${canInsert ? 'Yes' : 'No  '}`);
      }
    } else {
      console.log('Object Name                    | Type              | RLS    | Policies');
      console.log('-'.repeat(80));
      
      data.forEach(row => {
        const rlsStatus = row.has_rls ? 'Yes' : 'No ';
        console.log(`${row.object_name.padEnd(30)} | ${row.object_type.padEnd(17)} | ${rlsStatus}    | ${row.policy_count}`);
      });
    }
    
    console.log('\n📝 Summary:');
    console.log('- TABLES can have RLS enabled and policies applied');
    console.log('- VIEWS cannot have RLS enabled (they inherit from underlying tables)');
    console.log('- Service role operations bypass RLS on tables');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTablesAndViews();
