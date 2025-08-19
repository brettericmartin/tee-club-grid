#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugBagsLoading() {
  console.log('🔍 Debugging bags loading issue...\n');

  try {
    // 1. Check if user_bags table has any data
    console.log('1. Checking user_bags table...');
    const { count: bagCount, error: countError } = await supabase
      .from('user_bags')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting bags:', countError);
    } else {
      console.log(`✅ Found ${bagCount} bags in the database`);
    }

    // 2. Try to fetch bags with the same query structure
    console.log('\n2. Testing main bags query...');
    const { data: bags, error: bagsError } = await supabase
      .from('user_bags')
      .select(`
        id,
        name,
        bag_type,
        background_image,
        description,
        created_at,
        updated_at,
        likes_count,
        views_count,
        user_id,
        profiles (
          id,
          username,
          display_name,
          avatar_url,
          handicap,
          location,
          title
        ),
        bag_equipment (
          id,
          position,
          custom_photo_url,
          purchase_price,
          is_featured,
          equipment_id,
          equipment:equipment (
            id,
            brand,
            model,
            category,
            image_url,
            msrp
          )
        )
      `)
      .limit(5);

    if (bagsError) {
      console.error('❌ Error fetching bags with full query:', bagsError);
      
      // Try simpler query
      console.log('\n3. Testing simpler query...');
      const { data: simpleBags, error: simpleError } = await supabase
        .from('user_bags')
        .select('id, name, user_id')
        .limit(5);

      if (simpleError) {
        console.error('❌ Even simple query failed:', simpleError);
      } else {
        console.log(`✅ Simple query worked, found ${simpleBags?.length} bags`);
        console.log('Sample:', simpleBags?.[0]);
      }
    } else {
      console.log(`✅ Full query worked, found ${bags?.length} bags`);
      if (bags && bags.length > 0) {
        console.log('\nFirst bag structure:');
        console.log('- Name:', bags[0].name);
        console.log('- User ID:', bags[0].user_id);
        console.log('- Profile:', bags[0].profiles ? 'Loaded' : 'Missing');
        console.log('- Equipment count:', bags[0].bag_equipment?.length || 0);
      }
    }

    // 4. Check RLS policies
    console.log('\n4. Checking RLS policies for user_bags...');
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'user_bags');

    if (policyError) {
      console.error('❌ Error checking policies:', policyError);
    } else {
      console.log(`Found ${policies?.length || 0} policies for user_bags`);
      policies?.forEach(p => {
        console.log(`  - ${p.policyname}: ${p.cmd}`);
      });
    }

    // 5. Test anonymous access
    console.log('\n5. Testing anonymous access...');
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (anonKey) {
      const anonSupabase = createClient(supabaseUrl, anonKey);
      const { data: anonBags, error: anonError } = await anonSupabase
        .from('user_bags')
        .select('id, name')
        .limit(3);

      if (anonError) {
        console.error('❌ Anonymous access failed:', anonError);
      } else {
        console.log(`✅ Anonymous access worked, found ${anonBags?.length} bags`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Debug complete!');
}

debugBagsLoading();