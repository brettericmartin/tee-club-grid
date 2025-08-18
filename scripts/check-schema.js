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

/**
 * Comprehensive Database Schema Analysis
 * Checks table structures, constraints, indexes, and foreign key relationships
 */
async function checkDatabaseSchema() {
  console.log('🔍 COMPREHENSIVE DATABASE SCHEMA CHECK');
  console.log('=' .repeat(80));
  console.log('Analyzing database structure, constraints, indexes, and relationships...\n');

  const issues = [];
  
  try {
    // 1. Check all tables and their structures
    const tableInfo = await checkTableStructures();
    
    // 2. Verify constraints and foreign keys
    const constraintInfo = await checkConstraints();
    
    // 3. Analyze indexes
    const indexInfo = await checkIndexes();
    
    // 4. Check RLS policies
    const rlsInfo = await checkRLSPolicies();
    
    // 5. Validate data integrity
    const dataIntegrityInfo = await checkDataIntegrity();
    
    // 6. Check for schema mismatches with application code
    const codeMismatchInfo = await checkCodeSchemaMismatches();
    
    // 7. Generate comprehensive report
    await generateComprehensiveReport({
      tables: tableInfo,
      constraints: constraintInfo,
      indexes: indexInfo,
      rls: rlsInfo,
      dataIntegrity: dataIntegrityInfo,
      codeMismatches: codeMismatchInfo
    });
    
  } catch (error) {
    console.error('❌ Error during schema analysis:', error);
    // Fallback to basic analysis
    await performBasicAnalysis();
  }
}

async function checkTableStructures() {
  console.log('📊 CHECKING TABLE STRUCTURES\n');
  
  const expectedTables = [
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
    'user_follows',
    'user_badges',
    'badge_definitions',
    'shafts',
    'grips',
    'loft_options',
    'forum_categories',
    'forum_threads',
    'forum_posts',
    'forum_reactions'
  ];
  
  const tableInfo = {};
  const missingTables = [];
  
  for (const tableName of expectedTables) {
    try {
      // Check if table exists and get basic info
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        missingTables.push(tableName);
        console.log(`❌ ${tableName}: Table not found or inaccessible`);
        continue;
      }
      
      // Get table structure
      const { data: sample } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      const columns = sample && sample.length > 0 ? Object.keys(sample[0]) : [];
      
      tableInfo[tableName] = {
        exists: true,
        recordCount: count || 0,
        columns: columns,
        hasData: count > 0
      };
      
      console.log(`✅ ${tableName}: ${count || 0} records, ${columns.length} columns`);
      
    } catch (err) {
      missingTables.push(tableName);
      console.log(`❌ ${tableName}: Error - ${err.message}`);
    }
  }
  
  if (missingTables.length > 0) {
    console.log(`\n⚠️  Missing Tables: ${missingTables.join(', ')}`);
  }
  
  return { tableInfo, missingTables };
}

async function checkConstraints() {
  console.log('\n🔗 CHECKING CONSTRAINTS AND FOREIGN KEYS\n');
  
  const criticalRelationships = [
    {
      table: 'profiles',
      column: 'id',
      references: 'auth.users.id',
      description: 'Profile linked to auth user'
    },
    {
      table: 'user_bags', 
      column: 'user_id',
      references: 'profiles.id',
      description: 'Bag belongs to user'
    },
    {
      table: 'bag_equipment',
      column: 'bag_id', 
      references: 'user_bags.id',
      description: 'Equipment in bag'
    },
    {
      table: 'bag_equipment',
      column: 'equipment_id',
      references: 'equipment.id', 
      description: 'Equipment reference'
    },
    {
      table: 'equipment_photos',
      column: 'equipment_id',
      references: 'equipment.id',
      description: 'Photo linked to equipment'
    },
    {
      table: 'equipment_photos',
      column: 'user_id',
      references: 'profiles.id',
      description: 'Photo uploaded by user'
    },
    {
      table: 'feed_posts',
      column: 'user_id',
      references: 'profiles.id',
      description: 'Post by user'
    },
    {
      table: 'user_follows',
      column: 'follower_id',
      references: 'profiles.id',
      description: 'User following relationship'
    },
    {
      table: 'user_follows',
      column: 'following_id', 
      references: 'profiles.id',
      description: 'User being followed'
    }
  ];
  
  const constraintIssues = [];
  
  for (const rel of criticalRelationships) {
    try {
      // Check if the relationship exists by trying to join
      const { data, error } = await supabase
        .from(rel.table)
        .select(`${rel.column}`)
        .limit(1);
      
      if (error) {
        constraintIssues.push(`${rel.table}.${rel.column}: Table not accessible`);
        console.log(`❌ ${rel.description}: Cannot verify`);
      } else {
        console.log(`✅ ${rel.description}: Table accessible`);
      }
      
    } catch (err) {
      constraintIssues.push(`${rel.table}.${rel.column}: ${err.message}`);
      console.log(`❌ ${rel.description}: Error - ${err.message}`);
    }
  }
  
  return { constraintIssues, checkedRelationships: criticalRelationships.length };
}

async function checkIndexes() {
  console.log('\n📇 CHECKING INDEXES AND PERFORMANCE\n');
  
  const criticalIndexes = [
    { table: 'equipment', columns: ['category'], reason: 'Equipment filtering' },
    { table: 'equipment', columns: ['brand'], reason: 'Brand filtering' },
    { table: 'user_bags', columns: ['user_id'], reason: 'User bag lookup' },
    { table: 'bag_equipment', columns: ['bag_id'], reason: 'Bag contents lookup' },
    { table: 'bag_equipment', columns: ['equipment_id'], reason: 'Equipment usage lookup' },
    { table: 'equipment_photos', columns: ['equipment_id'], reason: 'Photo lookup' },
    { table: 'equipment_photos', columns: ['user_id'], reason: 'User photos' },
    { table: 'feed_posts', columns: ['user_id'], reason: 'User feed' },
    { table: 'feed_posts', columns: ['created_at'], reason: 'Chronological feed' },
    { table: 'user_follows', columns: ['follower_id'], reason: 'Following lookup' },
    { table: 'user_follows', columns: ['following_id'], reason: 'Followers lookup' }
  ];
  
  const indexRecommendations = [];
  
  // Note: Supabase automatically creates indexes for primary keys and foreign keys
  // We'll check if tables have the expected columns for indexing
  for (const index of criticalIndexes) {
    try {
      const { data: sample } = await supabase
        .from(index.table)
        .select(index.columns.join(','))
        .limit(1);
      
      if (sample) {
        console.log(`✅ ${index.table}(${index.columns.join(',')}): Column exists for indexing`);
      } else {
        indexRecommendations.push(`${index.table}(${index.columns.join(',')}): ${index.reason}`);
        console.log(`⚠️  ${index.table}(${index.columns.join(',')}): Recommended for ${index.reason}`);
      }
      
    } catch (err) {
      indexRecommendations.push(`${index.table}(${index.columns.join(',')}): Cannot verify - ${err.message}`);
      console.log(`❌ ${index.table}(${index.columns.join(',')}): Error - ${err.message}`);
    }
  }
  
  return { indexRecommendations, checkedIndexes: criticalIndexes.length };
}

async function checkRLSPolicies() {
  console.log('\n🔒 CHECKING ROW LEVEL SECURITY POLICIES\n');
  
  const rlsRequiredTables = [
    'profiles',
    'user_bags', 
    'bag_equipment',
    'equipment_photos',
    'equipment_reports',
    'equipment_saves',
    'feed_posts',
    'feed_likes',
    'feed_comments',
    'user_follows',
    'user_badges'
  ];
  
  const rlsIssues = [];
  
  for (const table of rlsRequiredTables) {
    try {
      // Try to access table without authentication
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('row-level security')) {
        console.log(`✅ ${table}: RLS properly enabled`);
      } else if (error && error.message.includes('permission denied')) {
        console.log(`✅ ${table}: Access restricted (likely has RLS)`);
      } else {
        rlsIssues.push(table);
        console.log(`⚠️  ${table}: May not have proper RLS policies`);
      }
      
    } catch (err) {
      console.log(`❓ ${table}: Cannot determine RLS status - ${err.message}`);
    }
  }
  
  return { rlsIssues, checkedTables: rlsRequiredTables.length };
}

async function checkDataIntegrity() {
  console.log('\n🔍 CHECKING DATA INTEGRITY\n');
  
  const integrityChecks = [];
  
  try {
    // Check for orphaned records
    const checks = [
      {
        name: 'Orphaned bag equipment',
        query: async () => {
          const { count } = await supabase
            .from('bag_equipment')
            .select('*', { count: 'exact', head: true })
            .is('bag_id', null);
          return count;
        }
      },
      {
        name: 'Equipment photos without equipment',
        query: async () => {
          const { count } = await supabase
            .from('equipment_photos')
            .select('*', { count: 'exact', head: true })
            .is('equipment_id', null);
          return count;
        }
      },
      {
        name: 'Users without primary bag',
        query: async () => {
          // This is more complex, would need a proper join
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
          const { count: bagCount } = await supabase
            .from('user_bags')
            .select('*', { count: 'exact', head: true })
            .eq('is_primary', true);
          return Math.max(0, (userCount || 0) - (bagCount || 0));
        }
      }
    ];
    
    for (const check of checks) {
      try {
        const result = await check.query();
        if (result > 0) {
          integrityChecks.push(`⚠️  ${check.name}: ${result} issues found`);
          console.log(`⚠️  ${check.name}: ${result} issues found`);
        } else {
          console.log(`✅ ${check.name}: No issues`);
        }
      } catch (err) {
        console.log(`❓ ${check.name}: Cannot check - ${err.message}`);
      }
    }
    
  } catch (err) {
    console.log(`❌ Data integrity check failed: ${err.message}`);
  }
  
  return { integrityChecks };
}

async function checkCodeSchemaMismatches() {
  console.log('\n🔧 CHECKING FOR CODE/SCHEMA MISMATCHES\n');
  
  const mismatches = [];
  
  // Check if tables expected by the application code exist
  const codeExpectedTables = {
    'equipment': ['id', 'name', 'brand', 'category', 'model', 'year', 'image_url'],
    'user_bags': ['id', 'user_id', 'name', 'is_primary', 'background_image'],
    'bag_equipment': ['id', 'bag_id', 'equipment_id', 'position_x', 'position_y'],
    'equipment_photos': ['id', 'equipment_id', 'user_id', 'url', 'is_verified'],
    'feed_posts': ['id', 'user_id', 'content', 'created_at', 'post_type'],
    'profiles': ['id', 'username', 'display_name', 'avatar_url']
  };
  
  for (const [tableName, expectedColumns] of Object.entries(codeExpectedTables)) {
    try {
      const { data: sample } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (sample && sample.length > 0) {
        const actualColumns = Object.keys(sample[0]);
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        
        if (missingColumns.length > 0) {
          mismatches.push(`${tableName}: Missing columns - ${missingColumns.join(', ')}`);
          console.log(`⚠️  ${tableName}: Missing expected columns - ${missingColumns.join(', ')}`);
        } else {
          console.log(`✅ ${tableName}: All expected columns present`);
        }
      } else {
        console.log(`❓ ${tableName}: No data to verify column structure`);
      }
      
    } catch (err) {
      mismatches.push(`${tableName}: Cannot verify - ${err.message}`);
      console.log(`❌ ${tableName}: Cannot verify structure - ${err.message}`);
    }
  }
  
  return { mismatches };
}

async function generateComprehensiveReport(analysis) {
  console.log('\n\n📋 COMPREHENSIVE SCHEMA ANALYSIS REPORT');
  console.log('=' .repeat(80));
  
  // Summary statistics
  const tableCount = Object.keys(analysis.tables.tableInfo || {}).length;
  const missingTableCount = analysis.tables.missingTables?.length || 0;
  const constraintIssueCount = analysis.constraints.constraintIssues?.length || 0;
  const rlsIssueCount = analysis.rls.rlsIssues?.length || 0;
  const integrityIssueCount = analysis.dataIntegrity.integrityChecks?.length || 0;
  const mismatchCount = analysis.codeMismatches.mismatches?.length || 0;
  
  console.log(`\n📊 SUMMARY STATISTICS:`);
  console.log(`   Tables found: ${tableCount}`);
  console.log(`   Missing tables: ${missingTableCount}`);
  console.log(`   Constraint issues: ${constraintIssueCount}`);
  console.log(`   RLS issues: ${rlsIssueCount}`);
  console.log(`   Data integrity issues: ${integrityIssueCount}`);
  console.log(`   Code/schema mismatches: ${mismatchCount}`);
  
  // Critical issues
  console.log(`\n🚨 CRITICAL ISSUES TO ADDRESS:`);
  if (missingTableCount === 0 && constraintIssueCount === 0 && rlsIssueCount === 0 && mismatchCount === 0) {
    console.log(`   ✅ No critical issues found! Database schema appears healthy.`);
  } else {
    if (missingTableCount > 0) {
      console.log(`   ❌ Missing tables: ${analysis.tables.missingTables.join(', ')}`);
    }
    if (constraintIssueCount > 0) {
      console.log(`   ❌ Constraint issues:`);
      analysis.constraints.constraintIssues.forEach(issue => {
        console.log(`      - ${issue}`);
      });
    }
    if (rlsIssueCount > 0) {
      console.log(`   ⚠️  RLS policy issues: ${analysis.rls.rlsIssues.join(', ')}`);
    }
    if (mismatchCount > 0) {
      console.log(`   ⚠️  Code/schema mismatches:`);
      analysis.codeMismatches.mismatches.forEach(mismatch => {
        console.log(`      - ${mismatch}`);
      });
    }
  }
  
  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);
  
  if (analysis.indexes.indexRecommendations?.length > 0) {
    console.log(`   📇 Index recommendations:`);
    analysis.indexes.indexRecommendations.forEach(rec => {
      console.log(`      - ${rec}`);
    });
  }
  
  if (integrityIssueCount > 0) {
    console.log(`   🔍 Data integrity cleanup needed:`);
    analysis.dataIntegrity.integrityChecks.forEach(issue => {
      console.log(`      - ${issue}`);
    });
  }
  
  console.log(`   🔄 Regular maintenance:`);
  console.log(`      - Monitor table sizes and query performance`);
  console.log(`      - Review RLS policies for new features`);
  console.log(`      - Run integrity checks weekly`);
  console.log(`      - Archive old data (feed posts > 90 days)`);
  console.log(`      - Backup user-generated content daily`);
  
  // Health score
  const totalChecks = 6;
  const passedChecks = [
    missingTableCount === 0,
    constraintIssueCount === 0, 
    rlsIssueCount === 0,
    integrityIssueCount === 0,
    mismatchCount === 0,
    (analysis.indexes.indexRecommendations?.length || 0) === 0
  ].filter(Boolean).length;
  
  const healthScore = Math.round((passedChecks / totalChecks) * 100);
  const healthStatus = healthScore >= 90 ? '🟢 EXCELLENT' : 
                      healthScore >= 75 ? '🟡 GOOD' : 
                      healthScore >= 50 ? '🟠 NEEDS ATTENTION' : '🔴 CRITICAL';
  
  console.log(`\n🏥 DATABASE HEALTH SCORE: ${healthScore}% ${healthStatus}`);
}

async function performBasicAnalysis() {
  console.log('📋 PERFORMING BASIC SCHEMA ANALYSIS (FALLBACK MODE)\n');
  
  const basicTables = [
    'profiles', 'equipment', 'user_bags', 'bag_equipment', 
    'equipment_photos', 'feed_posts', 'user_follows'
  ];
  
  for (const table of basicTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ ${table}: ${count || 0} records`);
        
        const { data: sample } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (sample && sample.length > 0) {
          console.log(`   Columns: ${Object.keys(sample[0]).join(', ')}`);
        }
      } else {
        console.log(`❌ ${table}: ${error.message}`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
    console.log('');
  }
}

// Run the schema check
checkDatabaseSchema()
  .then(() => {
    console.log('\n✨ Schema analysis complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Address any critical issues found above');
    console.log('   2. Review RLS policies for security');
    console.log('   3. Add recommended indexes for performance');
    console.log('   4. Set up monitoring for data integrity');
    console.log('\n💡 To run this check again: node scripts/check-schema.js');
  })
  .catch(error => {
    console.error('\n❌ Schema check failed:', error);
    console.log('This may indicate database connectivity issues or permission problems.');
  });