import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDatabaseHealth() {
  console.log('🔍 Additional Database Health Checks');
  console.log('===================================\n');
  
  // Check for missing indexes on foreign keys
  console.log('📇 CHECKING FOREIGN KEY INDEXES:');
  const foreignKeys = [
    { table: 'bag_equipment', column: 'bag_id' },
    { table: 'bag_equipment', column: 'equipment_id' },
    { table: 'bag_equipment', column: 'shaft_id' },
    { table: 'bag_equipment', column: 'grip_id' },
    { table: 'equipment_photos', column: 'equipment_id' },
    { table: 'equipment_photos', column: 'user_id' },
    { table: 'feed_posts', column: 'user_id' },
    { table: 'feed_posts', column: 'bag_id' },
    { table: 'user_follows', column: 'follower_id' },
    { table: 'user_follows', column: 'following_id' }
  ];
  
  for (const fk of foreignKeys) {
    try {
      const { data, error } = await supabase
        .from(fk.table)
        .select(fk.column)
        .not(fk.column, 'is', null)
        .limit(1);
      
      if (!error && data) {
        console.log(`✅ ${fk.table}.${fk.column}: Accessible for indexing`);
      } else {
        console.log(`⚠️  ${fk.table}.${fk.column}: ${error?.message || 'No data'}`);
      }
    } catch (err) {
      console.log(`❌ ${fk.table}.${fk.column}: ${err.message}`);
    }
  }
  
  console.log('\n🔍 CHECKING FOR POTENTIAL ISSUES:');
  
  // Check for tables without primary keys
  const tables = ['profiles', 'equipment', 'user_bags', 'bag_equipment', 'equipment_photos', 'feed_posts'];
  for (const table of tables) {
    try {
      const { data } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (data && data.length > 0 && data[0].id) {
        console.log(`✅ ${table}: Has primary key (id)`);
      } else {
        console.log(`⚠️  ${table}: Primary key might be missing`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Cannot check primary key - ${err.message}`);
    }
  }
  
  console.log('\n🔗 CHECKING CRITICAL RELATIONSHIPS:');
  
  // Check for orphaned records in critical tables
  try {
    // Check bag_equipment -> user_bags relationship
    const { data: orphanedBagEquip } = await supabase
      .from('bag_equipment')
      .select('id, bag_id')
      .not('bag_id', 'is', null)
      .limit(5);
    
    if (orphanedBagEquip && orphanedBagEquip.length > 0) {
      const bagIds = orphanedBagEquip.map(be => be.bag_id);
      const { data: existingBags } = await supabase
        .from('user_bags')
        .select('id')
        .in('id', bagIds);
      
      const existingBagIds = existingBags?.map(b => b.id) || [];
      const orphaned = bagIds.filter(id => !existingBagIds.includes(id));
      
      if (orphaned.length > 0) {
        console.log(`⚠️  Found bag_equipment referencing non-existent bags: ${orphaned.length} records`);
      } else {
        console.log('✅ bag_equipment -> user_bags: All references valid');
      }
    } else {
      console.log('✅ bag_equipment -> user_bags: No data to check');
    }
  } catch (err) {
    console.log(`❌ Cannot check bag_equipment relationships: ${err.message}`);
  }
  
  console.log('\n📊 TABLE SIZE ANALYSIS:');
  const tableStats = {};
  
  for (const table of tables) {
    try {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      tableStats[table] = count || 0;
      console.log(`${table}: ${count || 0} records`);
    } catch (err) {
      console.log(`${table}: Cannot count - ${err.message}`);
    }
  }
  
  // Identify unusually large tables that might need optimization
  const largeTableThreshold = 1000;
  const largeTables = Object.entries(tableStats)
    .filter(([table, count]) => count > largeTableThreshold);
  
  if (largeTables.length > 0) {
    console.log('\n⚠️  Large tables that may need optimization:');
    largeTables.forEach(([table, count]) => {
      console.log(`   ${table}: ${count} records`);
    });
  }
  
  console.log('\n🔧 CHECKING FOR CONSTRAINTS:');
  
  // Check for NOT NULL constraints where they should exist
  const criticalNotNullChecks = [
    { table: 'user_bags', column: 'user_id', description: 'Bag must have owner' },
    { table: 'bag_equipment', column: 'bag_id', description: 'Equipment must be in a bag' },
    { table: 'bag_equipment', column: 'equipment_id', description: 'Bag equipment must reference equipment' },
    { table: 'equipment_photos', column: 'equipment_id', description: 'Photo must be linked to equipment' },
    { table: 'feed_posts', column: 'user_id', description: 'Post must have author' }
  ];
  
  for (const check of criticalNotNullChecks) {
    try {
      const { count } = await supabase
        .from(check.table)
        .select('*', { count: 'exact', head: true })
        .is(check.column, null);
      
      if (count > 0) {
        console.log(`⚠️  ${check.table}.${check.column}: ${count} NULL values (${check.description})`);
      } else {
        console.log(`✅ ${check.table}.${check.column}: No NULL values`);
      }
    } catch (err) {
      console.log(`❌ ${check.table}.${check.column}: Cannot check - ${err.message}`);
    }
  }
}

checkDatabaseHealth()
  .then(() => {
    console.log('\n✨ Database health check complete!');
  })
  .catch(error => {
    console.error('\n❌ Health check failed:', error);
  });