import { supabase } from './supabase-admin.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyAffiliateVideoRLS() {
  console.log('🔧 Applying corrected RLS policies for affiliate video features...\n');
  
  try {
    // Read the SQL file
    const sqlFile = join(__dirname, 'fix-affiliate-video-rls-policies.sql');
    const sqlContent = readFileSync(sqlFile, 'utf8');
    
    // Split into individual statements (excluding comments and empty lines)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== 'COMMIT');
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements or pure comments
      if (!statement || statement.startsWith('--')) {
        continue;
      }
      
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}:`);
      console.log(`   ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`);
      
      try {
        // For RLS statements, we need to use the raw query method
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          // Try alternative approach if rpc doesn't work
          console.log(`   Trying alternative execution method...`);
          
          // For simpler statements that might work with from() method
          if (statement.includes('CREATE POLICY') || statement.includes('DROP POLICY') || statement.includes('ALTER TABLE')) {
            console.log(`   ❌ RLS Policy error: ${error.message}`);
            
            // For policy creation, let's try to execute using a different approach
            if (statement.includes('CREATE POLICY')) {
              console.log(`   ℹ️  This is expected - RLS policies may need to be set directly in Supabase dashboard`);
            }
            
            errorCount++;
          } else {
            console.log(`   ❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`   ✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.log(`   ❌ Exception: ${err.message}`);
        errorCount++;
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Execution Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${statements.length}`);
    
    if (errorCount > 0) {
      console.log(`\n⚠️  Some statements failed. This is often expected for RLS policies.`);
      console.log(`   Please run the verification script to check if policies are working.`);
    }
    
  } catch (error) {
    console.error(`❌ Error reading SQL file: ${error.message}`);
  }
}

// Also create manual execution function for individual policies
async function createPoliciesManually() {
  console.log('\n🔨 Creating policies manually using individual RPC calls...\n');
  
  const policies = [
    {
      table: 'user_equipment_links',
      name: 'Public read access for equipment links',
      type: 'SELECT',
      using: 'true'
    },
    {
      table: 'user_equipment_links', 
      name: 'Users can create equipment links for their own bags',
      type: 'INSERT',
      check: `auth.uid() = user_id AND EXISTS (SELECT 1 FROM user_bags WHERE user_bags.id = user_equipment_links.bag_id AND user_bags.user_id = auth.uid())`
    },
    {
      table: 'equipment_videos',
      name: 'Public read access for equipment videos', 
      type: 'SELECT',
      using: 'true'
    },
    {
      table: 'equipment_videos',
      name: 'Authenticated users can add equipment videos',
      type: 'INSERT', 
      check: 'auth.uid() IS NOT NULL AND added_by_user_id = auth.uid()'
    },
    {
      table: 'user_bag_videos',
      name: 'Public read access for bag videos',
      type: 'SELECT',
      using: 'true'
    },
    {
      table: 'user_bag_videos',
      name: 'Users can create videos for their own bags',
      type: 'INSERT',
      check: `auth.uid() = user_id AND EXISTS (SELECT 1 FROM user_bags WHERE user_bags.id = user_bag_videos.bag_id AND user_bags.user_id = auth.uid())`
    },
    {
      table: 'link_clicks',
      name: 'Public insert access for link click tracking',
      type: 'INSERT',
      check: 'true'
    },
    {
      table: 'link_clicks',
      name: 'Link owners can view their click analytics',
      type: 'SELECT',
      using: `EXISTS (SELECT 1 FROM user_equipment_links WHERE user_equipment_links.id = link_clicks.link_id AND user_equipment_links.user_id = auth.uid())`
    }
  ];
  
  console.log(`Creating ${policies.length} RLS policies manually...\n`);
  
  for (const policy of policies) {
    try {
      let policySQL;
      if (policy.type === 'SELECT') {
        policySQL = `CREATE POLICY "${policy.name}" ON ${policy.table} FOR ${policy.type} USING (${policy.using})`;
      } else if (policy.type === 'INSERT') {
        policySQL = `CREATE POLICY "${policy.name}" ON ${policy.table} FOR ${policy.type} WITH CHECK (${policy.check})`;
      }
      
      console.log(`📝 Creating policy: ${policy.name}`);
      console.log(`   Table: ${policy.table} | Type: ${policy.type}`);
      
      // This will likely fail with current Supabase client, but shows the correct SQL
      console.log(`   SQL: ${policySQL}`);
      console.log(`   ℹ️  Execute this SQL manually in Supabase SQL editor\n`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }
}

// Run both approaches
async function main() {
  await applyAffiliateVideoRLS();
  await createPoliciesManually();
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Copy the SQL from fix-affiliate-video-rls-policies.sql');
  console.log('2. Run it in Supabase Dashboard > SQL Editor');
  console.log('3. Run verification script: node scripts/verify-affiliate-rls.js');
}

main().catch(console.error);