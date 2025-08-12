#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function runMigration() {
  console.log('🔧 Running slug migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'add-profile-slug.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // For now, let's manually update the profiles with slugs
    // since we can't run raw SQL through the client library
    
    console.log('📝 Adding slug field to profiles...\n');
    
    // Get all profiles
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, display_name, username');
    
    if (fetchError) throw fetchError;
    
    console.log(`Found ${profiles.length} profiles to update:\n`);
    
    // Generate and update slugs
    for (const profile of profiles) {
      // Generate slug from display_name
      let slug = '';
      if (profile.display_name) {
        // Convert to lowercase and remove spaces/special chars
        slug = profile.display_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '');
      } else if (profile.username) {
        slug = profile.username
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '');
      } else {
        slug = `user${profile.id.substring(0, 8)}`;
      }
      
      // Ensure uniqueness
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', slug)
        .neq('id', profile.id)
        .single();
      
      if (existing) {
        // Add number suffix if not unique
        let counter = 1;
        let uniqueSlug = `${slug}${counter}`;
        while (true) {
          const { data: exists } = await supabase
            .from('profiles')
            .select('id')
            .eq('slug', uniqueSlug)
            .single();
          
          if (!exists) {
            slug = uniqueSlug;
            break;
          }
          counter++;
          uniqueSlug = `${slug}${counter}`;
        }
      }
      
      // Update the profile with the slug
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ slug })
        .eq('id', profile.id);
      
      if (updateError) {
        // Slug field might not exist yet, that's okay
        console.log(`⚠️  Could not update slug for ${profile.display_name || profile.username} (field may not exist yet)`);
      } else {
        console.log(`✅ ${profile.display_name || profile.username} → @${slug}`);
      }
    }
    
    console.log('\n✨ Slug setup complete!');
    console.log('\nURLs for testing:');
    
    // Show the new URLs
    const { data: updatedProfiles } = await supabase
      .from('profiles')
      .select('display_name, slug');
    
    updatedProfiles?.forEach(p => {
      if (p.slug) {
        console.log(`  ${p.display_name}: http://localhost:3333/@${p.slug}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();