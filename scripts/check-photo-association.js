import { createClient } from '@supabase/supabase-js';
import './supabase-admin.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPhotoAssociation() {
  try {
    // Check equipment_photos table structure
    console.log('=== EQUIPMENT_PHOTOS TABLE STRUCTURE ===');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'equipment_photos' });
    
    if (columnsError) {
      console.log('Error getting columns:', columnsError);
    } else {
      console.log('Columns:', columns);
    }

    // Get recent equipment photos
    console.log('\n=== RECENT EQUIPMENT PHOTOS (last 10) ===');
    const { data: photos, error: photosError } = await supabase
      .from('equipment_photos')
      .select(`
        *,
        equipment:equipment_id(
          id,
          name,
          brand,
          model
        ),
        profiles:user_id(
          username
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (photosError) {
      console.log('Error fetching photos:', photosError);
    } else {
      photos?.forEach(photo => {
        console.log(`\nPhoto ID: ${photo.id}`);
        console.log(`  Equipment ID: ${photo.equipment_id}`);
        console.log(`  Equipment: ${photo.equipment?.brand} ${photo.equipment?.model}`);
        console.log(`  User: ${photo.profiles?.username}`);
        console.log(`  URL: ${photo.photo_url?.substring(0, 50)}...`);
        console.log(`  Created: ${photo.created_at}`);
      });
    }

    // Check for orphaned photos (no equipment association)
    console.log('\n=== CHECKING FOR ORPHANED PHOTOS ===');
    const { data: orphaned, error: orphanedError } = await supabase
      .from('equipment_photos')
      .select('*')
      .is('equipment_id', null)
      .limit(10);

    if (orphanedError) {
      console.log('Error checking orphaned:', orphanedError);
    } else if (orphaned && orphaned.length > 0) {
      console.log(`Found ${orphaned.length} photos with NULL equipment_id:`);
      orphaned.forEach(photo => {
        console.log(`  - Photo ID: ${photo.id}, User: ${photo.user_id}, Created: ${photo.created_at}`);
      });
    } else {
      console.log('No orphaned photos found');
    }

    // Check RLS policies
    console.log('\n=== RLS POLICIES FOR EQUIPMENT_PHOTOS ===');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'equipment_photos' });

    if (policiesError) {
      // Try alternative query
      const { data: altPolicies, error: altError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'equipment_photos');
      
      if (altError) {
        console.log('Could not fetch policies');
      } else {
        console.log('Policies:', altPolicies);
      }
    } else {
      policies?.forEach(policy => {
        console.log(`\nPolicy: ${policy.policyname}`);
        console.log(`  Command: ${policy.cmd}`);
        console.log(`  Definition: ${policy.qual || policy.definition}`);
      });
    }

    // Check feed_posts with equipment associations
    console.log('\n=== RECENT FEED POSTS WITH EQUIPMENT ===');
    const { data: feedPosts, error: feedError } = await supabase
      .from('feed_posts')
      .select(`
        id,
        content,
        image_url,
        equipment_id,
        equipment:equipment_id(
          id,
          brand,
          model
        ),
        created_at
      `)
      .not('equipment_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (feedError) {
      console.log('Error fetching feed posts:', feedError);
    } else {
      feedPosts?.forEach(post => {
        console.log(`\nFeed Post ID: ${post.id}`);
        console.log(`  Equipment: ${post.equipment?.brand} ${post.equipment?.model}`);
        console.log(`  Has Image: ${!!post.image_url}`);
        console.log(`  Created: ${post.created_at}`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkPhotoAssociation();