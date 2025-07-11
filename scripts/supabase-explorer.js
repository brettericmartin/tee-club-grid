import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function exploreDatabase() {
  console.log('\n🏌️ Teed.club Database Explorer\n');
  console.log('================================\n');

  // 1. List all tables with row counts
  console.log('📊 Table Overview:');
  console.log('------------------');
  
  const tables = [
    'profiles',
    'bags', 
    'bag_equipment',
    'equipment',
    'feed_posts',
    'user_follows',
    'bag_likes',
    'equipment_photo_likes',
    'likes'
  ];

  const tableInfo = {};
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        tableInfo[table] = count;
        console.log(`✓ ${table.padEnd(25)} ${count} rows`);
      } else {
        console.log(`✗ ${table.padEnd(25)} Error: ${error.message}`);
      }
    } catch (e) {
      console.log(`✗ ${table.padEnd(25)} Not accessible`);
    }
  }

  // 2. Show sample data from key tables
  console.log('\n📋 Sample Data:');
  console.log('---------------\n');

  // Profiles
  console.log('Recent Profiles:');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, bio, handicap')
    .limit(3);
  
  if (profiles?.length) {
    profiles.forEach(p => {
      console.log(`  • ${p.username || 'No username'} - ${p.full_name || 'No name'} (Handicap: ${p.handicap || 'N/A'})`);
    });
  } else {
    console.log('  No profiles found');
  }

  // Equipment
  console.log('\n\nPopular Equipment:');
  const { data: equipment } = await supabase
    .from('equipment')
    .select('brand, model, category')
    .limit(5)
    .order('created_at', { ascending: false });
  
  if (equipment?.length) {
    equipment.forEach(e => {
      console.log(`  • ${e.brand} ${e.model} (${e.category})`);
    });
  } else {
    console.log('  No equipment found');
  }

  // Bags
  console.log('\n\nRecent Bags:');
  const { data: bags } = await supabase
    .from('bags')
    .select('name, description, is_public')
    .limit(3)
    .order('created_at', { ascending: false });
  
  if (bags?.length) {
    bags.forEach(b => {
      console.log(`  • "${b.name}" - ${b.description || 'No description'} (${b.is_public ? 'Public' : 'Private'})`);
    });
  } else {
    console.log('  No bags found');
  }

  // 3. Check relationships
  console.log('\n\n🔗 Relationship Check:');
  console.log('---------------------');
  
  // Check bags with equipment
  const { data: bagsWithEquipment, error: bagError } = await supabase
    .from('bags')
    .select(`
      name,
      bag_equipment (
        equipment (
          brand,
          model
        )
      )
    `)
    .limit(1);
  
  if (bagsWithEquipment?.length && bagsWithEquipment[0].bag_equipment?.length) {
    console.log('✓ Bags → Equipment relationship working');
    console.log(`  Example: "${bagsWithEquipment[0].name}" has ${bagsWithEquipment[0].bag_equipment.length} items`);
  } else {
    console.log('✗ No bags with equipment found');
  }

  // 4. Database health check
  console.log('\n\n🏥 Database Health:');
  console.log('------------------');
  
  const issues = [];
  
  if (tableInfo.profiles === 0) issues.push('No user profiles');
  if (tableInfo.equipment === 0) issues.push('No equipment data');
  if (tableInfo.bags === 0) issues.push('No bags created');
  
  if (issues.length === 0) {
    console.log('✅ All core tables have data');
  } else {
    console.log('⚠️  Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }

  console.log('\n================================\n');
}

// Run the explorer
exploreDatabase().catch(console.error);