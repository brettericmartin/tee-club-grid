import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkBagColumns() {
  console.log('🔍 Checking user_bags table columns...\n');

  try {
    // Get one bag to see its structure
    const { data: bag, error } = await supabase
      .from('user_bags')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('❌ Error fetching bag:', error);
      return;
    }

    console.log('✅ user_bags table columns:');
    if (bag) {
      Object.keys(bag).forEach(key => {
        console.log(`   - ${key}: ${typeof bag[key]} (${bag[key] === null ? 'null' : 'has value'})`);
      });
    }

    // Check if likes_count or tees_count exists
    const hasLikesCount = bag && 'likes_count' in bag;
    const hasTeesCount = bag && 'tees_count' in bag;

    console.log('\n📊 Column Status:');
    console.log(`   likes_count: ${hasLikesCount ? '✅ Exists' : '❌ Missing'}`);
    console.log(`   tees_count: ${hasTeesCount ? '✅ Exists' : '❌ Missing'}`);

    if (!hasLikesCount && !hasTeesCount) {
      console.log('\n⚠️ Neither likes_count nor tees_count column exists!');
      console.log('   Run the SQL script to add these columns.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkBagColumns();