import { supabase } from './supabase-admin.js';

async function getActualTables() {
  console.log('\n📋 Getting ACTUAL tables from database...\n');
  
  try {
    // Query the actual PostgreSQL system catalog
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename;
      `
    });

    if (error) {
      // Try alternative approach - just try to select from known tables
      console.log('RPC failed, trying direct queries...\n');
      
      const possibleTables = [
        'profiles',
        'equipment', 
        'user_bags',
        'bag_equipment',
        'equipment_photos',
        'equipment_reports',
        'equipment_reviews',
        'equipment_saves',
        'equipment_wishlist',
        'feed_posts',
        'feed_likes',
        'feed_comments',
        'bag_likes',
        'bag_tees',
        'equipment_tees',
        'user_follows',
        'user_badges',
        'badge_definitions',
        'badges',
        'shafts',
        'grips',
        'loft_options',
        'forum_categories',
        'forum_threads',
        'forum_posts',
        'forum_reactions',
        'saved_photos'
      ];

      const existingTables = [];
      
      for (const table of possibleTables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(0); // Just check if table exists
          
          if (!error) {
            const { count } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true });
            
            existingTables.push({ table, count: count || 0 });
            console.log(`✅ ${table}: EXISTS (${count || 0} records)`);
          } else {
            console.log(`❌ ${table}: DOES NOT EXIST`);
          }
        } catch (err) {
          console.log(`❌ ${table}: DOES NOT EXIST`);
        }
      }
      
      console.log('\n📊 TABLES THAT ACTUALLY EXIST:');
      console.log('================================');
      existingTables.forEach(t => {
        console.log(`  - ${t.table} (${t.count} records)`);
      });
      
      return existingTables;
    }

    console.log('Tables from pg_tables:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

getActualTables().catch(console.error);