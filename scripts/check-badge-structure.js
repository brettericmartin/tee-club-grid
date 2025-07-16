import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBadgeStructure() {
  console.log('🔍 Checking Badge Data Structure');
  console.log('================================\n');

  // Get a user ID that has badges
  const { data: userWithBadges } = await supabase
    .from('user_badges')
    .select('user_id')
    .limit(1)
    .single();

  if (!userWithBadges) {
    console.log('No users with badges found');
    return;
  }

  const userId = userWithBadges.user_id;
  console.log('Testing with user:', userId);

  // Test the exact query that BadgeService uses
  console.log('\n1️⃣ Testing BadgeService query...');
  const { data, error } = await supabase
    .from('user_badges')
    .select(`
      *,
      badge:badges (*)
    `)
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) {
    console.error('❌ Query error:', error);
    return;
  }

  console.log(`✅ Query successful, returned ${data?.length || 0} badges`);
  
  if (data && data.length > 0) {
    console.log('\n📋 First badge structure:');
    const firstBadge = data[0];
    console.log(JSON.stringify(firstBadge, null, 2));
    
    console.log('\n🔍 Badge data structure analysis:');
    console.log('- Has id:', !!firstBadge.id);
    console.log('- Has user_id:', !!firstBadge.user_id);
    console.log('- Has badge_id:', !!firstBadge.badge_id);
    console.log('- Has progress:', firstBadge.progress !== undefined);
    console.log('- Has earned_at:', !!firstBadge.earned_at);
    console.log('- Has badge object:', !!firstBadge.badge);
    
    if (firstBadge.badge) {
      console.log('\n📛 Badge object structure:');
      console.log('- Has id:', !!firstBadge.badge.id);
      console.log('- Has name:', !!firstBadge.badge.name);
      console.log('- Has description:', !!firstBadge.badge.description);
      console.log('- Has icon:', !!firstBadge.badge.icon);
      console.log('- Has category:', !!firstBadge.badge.category);
      console.log('- Has tier:', !!firstBadge.badge.tier);
      console.log('- Has rarity:', !!firstBadge.badge.rarity);
      console.log('- Has is_dynamic:', firstBadge.badge.is_dynamic !== undefined);
    }
  }
}

checkBadgeStructure();