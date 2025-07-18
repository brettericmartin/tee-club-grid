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

async function analyzeDatabase() {
  console.log('🔍 Analyzing Supabase Database Structure...\n');
  console.log('=' .repeat(60));

  try {
    // 1. Get all tables
    console.log('\n📊 TABLE INVENTORY\n');
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
          FROM pg_tables 
          WHERE schemaname = 'public' 
          ORDER BY tablename;
        `
      })
      .single();

    if (tablesError) {
      // Fallback to listing tables we know about
      console.log('Using fallback method to analyze tables...\n');
      await analyzeFallback();
      return;
    }

    console.log('Tables found:');
    const tableList = JSON.parse(tables.result);
    tableList.forEach(t => {
      console.log(`  - ${t.tablename} (${t.size})`);
    });

    // 2. Analyze each table structure
    console.log('\n\n📋 TABLE STRUCTURES\n');
    for (const table of tableList) {
      await analyzeTable(table.tablename);
    }

    // 3. Check relationships
    console.log('\n\n🔗 FOREIGN KEY RELATIONSHIPS\n');
    await analyzeRelationships();

    // 4. Check RLS policies
    console.log('\n\n🔒 ROW LEVEL SECURITY STATUS\n');
    await analyzeRLS();

    // 5. Storage buckets
    console.log('\n\n📦 STORAGE BUCKETS\n');
    await analyzeStorage();

  } catch (error) {
    console.error('Error during analysis:', error);
    // Use fallback method
    await analyzeFallback();
  }
}

async function analyzeFallback() {
  // Known tables to check
  const knownTables = [
    'profiles',
    'equipment', 
    'user_bags',
    'bag_equipment',
    'equipment_photos',
    'equipment_reports',
    'equipment_reviews',
    'feed_posts',
    'feed_likes',
    'feed_comments',
    'bag_likes',
    'bag_tees',
    'user_follows',
    'user_badges',
    'badge_definitions',
    'equipment_saves',
    'equipment_wishlist',
    'shafts',
    'grips',
    'loft_options'
  ];

  for (const table of knownTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ ${table}: ${count || 0} records`);
        
        // Get sample structure
        const { data: sample } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (sample && sample.length > 0) {
          console.log(`   Columns: ${Object.keys(sample[0]).join(', ')}`);
        }
      } else {
        console.log(`❌ ${table}: Not found or inaccessible`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Error accessing`);
    }
    console.log('');
  }
}

async function analyzeTable(tableName) {
  try {
    // Get record count
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n${tableName.toUpperCase()} (${count || 0} records)`);
    
    // Get column info
    const { data: sample } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (sample && sample.length > 0) {
      console.log('Columns:');
      Object.entries(sample[0]).forEach(([key, value]) => {
        const type = value === null ? 'null' : typeof value;
        console.log(`  - ${key}: ${type}`);
      });
    }
  } catch (err) {
    console.log(`Could not analyze ${tableName}: ${err.message}`);
  }
}

async function analyzeRelationships() {
  const relationships = [
    { from: 'profiles', to: 'auth.users', via: 'id' },
    { from: 'user_bags', to: 'profiles', via: 'user_id' },
    { from: 'bag_equipment', to: 'user_bags', via: 'bag_id' },
    { from: 'bag_equipment', to: 'equipment', via: 'equipment_id' },
    { from: 'equipment_photos', to: 'equipment', via: 'equipment_id' },
    { from: 'equipment_photos', to: 'profiles', via: 'user_id' },
    { from: 'equipment_reports', to: 'equipment', via: 'equipment_id' },
    { from: 'equipment_reports', to: 'profiles', via: 'reported_by' },
    { from: 'feed_posts', to: 'profiles', via: 'user_id' },
    { from: 'user_follows', to: 'profiles', via: 'follower_id/following_id' },
    { from: 'user_badges', to: 'profiles', via: 'user_id' },
    { from: 'user_badges', to: 'badge_definitions', via: 'badge_id' }
  ];

  relationships.forEach(rel => {
    console.log(`${rel.from} → ${rel.to} (via ${rel.via})`);
  });
}

async function analyzeRLS() {
  const tablesToCheck = [
    'profiles', 'equipment', 'user_bags', 'bag_equipment',
    'equipment_photos', 'equipment_reports', 'feed_posts'
  ];

  for (const table of tablesToCheck) {
    try {
      // Try to select without auth to test RLS
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('row-level security')) {
        console.log(`✅ ${table}: RLS enabled`);
      } else {
        console.log(`⚠️  ${table}: May not have proper RLS`);
      }
    } catch (err) {
      console.log(`❓ ${table}: Could not check RLS`);
    }
  }
}

async function analyzeStorage() {
  const buckets = ['user-content', 'equipment-photos'];
  
  for (const bucket of buckets) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list('', { limit: 1 });
      
      if (!error) {
        console.log(`✅ ${bucket}: Accessible`);
      } else {
        console.log(`❌ ${bucket}: ${error.message}`);
      }
    } catch (err) {
      console.log(`❌ ${bucket}: Error accessing`);
    }
  }
}

// Generate summary report
async function generateSummary() {
  console.log('\n\n📊 DATABASE HEALTH SUMMARY\n');
  console.log('=' .repeat(60));
  
  const checks = [];
  
  // Check core tables exist
  const coreTables = ['profiles', 'equipment', 'user_bags', 'bag_equipment'];
  for (const table of coreTables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    checks.push({
      name: `Core table: ${table}`,
      status: !error ? '✅' : '❌',
      note: error?.message
    });
  }
  
  // Check feed system
  const feedTables = ['feed_posts', 'feed_likes', 'feed_comments'];
  let feedWorking = true;
  for (const table of feedTables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) feedWorking = false;
  }
  checks.push({
    name: 'Feed system',
    status: feedWorking ? '✅' : '⚠️',
    note: feedWorking ? 'All feed tables present' : 'Some feed tables missing'
  });
  
  // Check equipment photos
  const { count: photoCount } = await supabase
    .from('equipment_photos')
    .select('*', { count: 'exact', head: true });
  checks.push({
    name: 'Equipment photos',
    status: '✅',
    note: `${photoCount || 0} photos in database`
  });
  
  // Check reporting system
  const { error: reportsError } = await supabase
    .from('equipment_reports')
    .select('id')
    .limit(1);
  checks.push({
    name: 'Reporting system',
    status: !reportsError ? '✅' : '❌',
    note: reportsError ? 'Not set up' : 'Ready'
  });
  
  // Display summary
  checks.forEach(check => {
    console.log(`${check.status} ${check.name}`);
    if (check.note) {
      console.log(`   └─ ${check.note}`);
    }
  });
  
  console.log('\n\n💡 RECOMMENDATIONS\n');
  console.log('=' .repeat(60));
  console.log('1. Ensure all tables have appropriate RLS policies');
  console.log('2. Add indexes on frequently queried columns (user_id, equipment_id)');
  console.log('3. Consider archiving old feed posts after 90 days');
  console.log('4. Monitor equipment_photos table size as it grows');
  console.log('5. Set up regular backups of user-generated content');
}

// Run analysis
analyzeDatabase()
  .then(() => generateSummary())
  .then(() => {
    console.log('\n✨ Database analysis complete!');
  })
  .catch(console.error);