import { supabase } from './supabase-admin.js';

async function applyRLSPoliciesManually() {
  console.log('🔧 Manually applying RLS policies using Supabase admin client...\n');
  
  // The SQL statements we need to execute
  const rlsStatements = [
    // Drop existing policies first
    `DROP POLICY IF EXISTS "Users can view all equipment links" ON user_equipment_links;`,
    `DROP POLICY IF EXISTS "Users can create their own equipment links" ON user_equipment_links;`,
    `DROP POLICY IF EXISTS "Users can update their own equipment links" ON user_equipment_links;`,
    `DROP POLICY IF EXISTS "Users can delete their own equipment links" ON user_equipment_links;`,
    
    `DROP POLICY IF EXISTS "Anyone can view equipment videos" ON equipment_videos;`,
    `DROP POLICY IF EXISTS "Authenticated users can add equipment videos" ON equipment_videos;`, 
    `DROP POLICY IF EXISTS "Users can update their own equipment videos" ON equipment_videos;`,
    `DROP POLICY IF EXISTS "Users can delete their own equipment videos" ON equipment_videos;`,
    
    `DROP POLICY IF EXISTS "Anyone can view bag videos" ON user_bag_videos;`,
    `DROP POLICY IF EXISTS "Users can create their own bag videos" ON user_bag_videos;`,
    `DROP POLICY IF EXISTS "Users can update their own bag videos" ON user_bag_videos;`,
    `DROP POLICY IF EXISTS "Users can delete their own bag videos" ON user_bag_videos;`,
    
    `DROP POLICY IF EXISTS "Anyone can track link clicks" ON link_clicks;`,
    `DROP POLICY IF EXISTS "Link owners can view their click analytics" ON link_clicks;`,
    
    // Enable RLS
    `ALTER TABLE user_equipment_links ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE equipment_videos ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE user_bag_videos ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;`,
    
    // Create new policies
    `CREATE POLICY "Public read access for equipment links" ON user_equipment_links FOR SELECT USING (true);`,
    
    `CREATE POLICY "Users can create equipment links for their own bags" ON user_equipment_links FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM user_bags WHERE user_bags.id = user_equipment_links.bag_id AND user_bags.user_id = auth.uid()));`,
    
    `CREATE POLICY "Users can update their own equipment links" ON user_equipment_links FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM user_bags WHERE user_bags.id = user_equipment_links.bag_id AND user_bags.user_id = auth.uid()));`,
    
    `CREATE POLICY "Users can delete their own equipment links" ON user_equipment_links FOR DELETE USING (auth.uid() = user_id);`,
    
    `CREATE POLICY "Public read access for equipment videos" ON equipment_videos FOR SELECT USING (true);`,
    
    `CREATE POLICY "Authenticated users can add equipment videos" ON equipment_videos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND added_by_user_id = auth.uid());`,
    
    `CREATE POLICY "Users can update equipment videos they added" ON equipment_videos FOR UPDATE USING (auth.uid() = added_by_user_id) WITH CHECK (auth.uid() = added_by_user_id);`,
    
    `CREATE POLICY "Users can delete equipment videos they added" ON equipment_videos FOR DELETE USING (auth.uid() = added_by_user_id);`,
    
    `CREATE POLICY "Public read access for bag videos" ON user_bag_videos FOR SELECT USING (true);`,
    
    `CREATE POLICY "Users can create videos for their own bags" ON user_bag_videos FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM user_bags WHERE user_bags.id = user_bag_videos.bag_id AND user_bags.user_id = auth.uid()));`,
    
    `CREATE POLICY "Users can update their own bag videos" ON user_bag_videos FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM user_bags WHERE user_bags.id = user_bag_videos.bag_id AND user_bags.user_id = auth.uid()));`,
    
    `CREATE POLICY "Users can delete their own bag videos" ON user_bag_videos FOR DELETE USING (auth.uid() = user_id);`,
    
    `CREATE POLICY "Public insert access for link click tracking" ON link_clicks FOR INSERT WITH CHECK (true);`,
    
    `CREATE POLICY "Link owners can view their click analytics" ON link_clicks FOR SELECT USING (EXISTS (SELECT 1 FROM user_equipment_links WHERE user_equipment_links.id = link_clicks.link_id AND user_equipment_links.user_id = auth.uid()));`
  ];
  
  console.log(`📝 Executing ${rlsStatements.length} RLS statements...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < rlsStatements.length; i++) {
    const statement = rlsStatements[i].trim();
    
    if (!statement) continue;
    
    console.log(`⚡ ${i + 1}/${rlsStatements.length}: ${statement.substring(0, 60)}...`);
    
    try {
      // Use the postgrest client to execute raw SQL
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          sql: statement
        })
      });
      
      if (response.ok) {
        console.log(`   ✅ Success`);
        successCount++;
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${response.status} - ${errorText}`);
        errorCount++;
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
      errorCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log(`\n⚠️  Some statements failed. The RLS policies need to be applied manually.`);
    console.log(`\n📋 MANUAL EXECUTION REQUIRED:`);
    console.log(`1. Go to Supabase Dashboard > SQL Editor`);
    console.log(`2. Copy and paste the content from: scripts/fix-affiliate-video-rls-policies.sql`);
    console.log(`3. Click "Run" to execute all statements at once`);
    console.log(`4. Then run: node scripts/verify-affiliate-rls.js`);
  } else {
    console.log(`\n✅ All RLS policies applied successfully!`);
    console.log(`Run verification: node scripts/verify-affiliate-rls.js`);
  }
}

applyRLSPoliciesManually().catch(console.error);