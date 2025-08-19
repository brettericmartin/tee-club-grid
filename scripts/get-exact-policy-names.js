#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

async function getExactPolicyNames() {
  console.log('🔍 Getting EXACT RLS policy names from database...\n');
  
  const tables = [
    'feed_posts', 'feed_likes', 'profiles', 'user_follows', 
    'equipment', 'equipment_photos', 'user_bags', 'bag_equipment',
    'equipment_saves', 'equipment_tees', 'bag_tees', 'feed_comments',
    'equipment_reviews', 'equipment_wishlist', 'bag_likes', 'user_badges',
    'badges', 'loft_options', 'forum_categories', 'forum_threads', 
    'forum_posts', 'forum_reactions'
  ];
  
  try {
    // Create a verification query to see if we can get policies
    const testQuery = `
      SELECT 
        tablename,
        policyname,
        cmd,
        permissive,
        roles,
        qual,
        with_check
      FROM pg_policies 
      WHERE schemaname = 'public'
      AND tablename IN (${tables.map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY tablename, policyname;
    `;
    
    // Try using the same pattern as the SQL file
    const verificationQuery = `
      SELECT 
        tablename,
        policyname,
        cmd,
        qual
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'equipment', 'user_bags', 'bag_equipment', 
        'equipment_photos', 'equipment_reviews', 'equipment_saves', 
        'equipment_wishlist', 'feed_posts', 'feed_likes', 'feed_comments',
        'bag_likes', 'bag_tees', 'equipment_tees', 'user_follows',
        'user_badges', 'badges', 'loft_options', 'forum_categories',
        'forum_threads', 'forum_posts', 'forum_reactions'
      )
      ORDER BY tablename, policyname;
    `;
    
    console.log('🔍 Attempting to query pg_policies view directly...');
    
    // Since Supabase doesn't allow direct RPC calls, let's try a different approach
    // We'll use the fact that we can create a temporary function
    
    const createFuncQuery = `
      CREATE OR REPLACE FUNCTION get_policies_temp()
      RETURNS TABLE(
        table_name text,
        policy_name text,
        command text,
        qualification text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          tablename::text,
          policyname::text,
          cmd::text,
          COALESCE(qual, '')::text
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = ANY(ARRAY[
          'profiles', 'equipment', 'user_bags', 'bag_equipment', 
          'equipment_photos', 'equipment_reviews', 'equipment_saves', 
          'equipment_wishlist', 'feed_posts', 'feed_likes', 'feed_comments',
          'bag_likes', 'bag_tees', 'equipment_tees', 'user_follows',
          'user_badges', 'badges', 'loft_options', 'forum_categories',
          'forum_threads', 'forum_posts', 'forum_reactions'
        ])
        ORDER BY tablename, policyname;
      END;
      $$;
    `;
    
    // Execute the function creation
    const { error: createError } = await supabase.rpc('exec', { 
      sql: createFuncQuery 
    });
    
    if (createError) {
      console.log('❌ Could not create temp function:', createError.message);
      
      // Alternative: Use information based on SQL files
      console.log('\n📋 Based on SQL files, here are the likely policy names:');
      
      const policyMappings = {
        'feed_posts': ['public_read'],
        'feed_likes': ['public_read', 'Anyone can view feed likes', 'Authenticated users can add likes', 'Users can remove their likes'],
        'profiles': ['public_read'],
        'user_follows': ['public_read', 'Users can view all follows', 'Authenticated users can follow', 'Users can unfollow'],
        'equipment': ['public_read'],
        'equipment_photos': ['public_read'],
        'user_bags': ['public_read'],
        'bag_equipment': ['public_read'],
        'equipment_saves': ['private_to_user'],
        'equipment_tees': ['public_read', 'Anyone can view equipment tees', 'Authenticated users can tee equipment', 'Users can untee equipment'],
        'bag_tees': ['public_read', 'Anyone can view bag tees', 'Authenticated users can tee bags', 'Users can untee bags'],
        'feed_comments': ['public_read'],
        'equipment_reviews': ['public_read'],
        'equipment_wishlist': ['private_to_user'],
        'bag_likes': ['public_read'],
        'user_badges': ['public_read'],
        'badges': ['public_read'],
        'loft_options': ['public_read'],
        'forum_categories': ['public_read'],
        'forum_threads': ['public_read'],
        'forum_posts': ['public_read'],
        'forum_reactions': ['public_read']
      };
      
      console.log('\n🗑️  DROP statements based on SQL file analysis:');
      console.log('-- Copy these to remove ALL existing policies:');
      console.log('');
      
      for (const [tableName, policies] of Object.entries(policyMappings)) {
        console.log(`-- Table: ${tableName}`);
        for (const policyName of policies) {
          console.log(`DROP POLICY IF EXISTS "${policyName}" ON "${tableName}";`);
        }
        console.log('');
      }
      
      // Also include the comprehensive drop from the SQL file
      console.log('-- OR use the comprehensive drop from fix-rls-public-read-FINAL.sql:');
      console.log(`
DO $$ 
DECLARE
    pol record;
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'profiles', 'equipment', 'user_bags', 'bag_equipment', 
        'equipment_photos', 'equipment_reviews', 'equipment_saves', 
        'equipment_wishlist', 'feed_posts', 'feed_likes', 'feed_comments',
        'bag_likes', 'bag_tees', 'equipment_tees', 'user_follows',
        'user_badges', 'badges', 'loft_options', 'forum_categories',
        'forum_threads', 'forum_posts', 'forum_reactions'
    ])
    LOOP
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = tbl 
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
        END LOOP;
    END LOOP;
END $$;
      `);
      
    } else {
      // Try to call the function
      const { data: policies, error: queryError } = await supabase.rpc('get_policies_temp');
      
      if (queryError) {
        console.log('❌ Could not call temp function:', queryError.message);
      } else {
        console.log('✅ Successfully retrieved policies:');
        console.log('\n📋 Current RLS Policies:');
        
        if (policies && policies.length > 0) {
          let currentTable = '';
          policies.forEach(policy => {
            if (policy.table_name !== currentTable) {
              currentTable = policy.table_name;
              console.log(`\n🔸 Table: ${policy.table_name}`);
            }
            
            console.log(`  Policy: "${policy.policy_name}" (${policy.command})`);
            if (policy.qualification) {
              console.log(`    Qual: ${policy.qualification}`);
            }
          });
          
          console.log('\n🗑️  EXACT DROP statements:');
          console.log('-- Copy these to remove existing policies:');
          console.log('');
          
          policies.forEach(policy => {
            console.log(`DROP POLICY IF EXISTS "${policy.policy_name}" ON "${policy.table_name}";`);
          });
          
        } else {
          console.log('No policies found.');
        }
      }
      
      // Clean up the temp function
      await supabase.rpc('exec', { 
        sql: 'DROP FUNCTION IF EXISTS get_policies_temp();' 
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('\n✨ Policy extraction complete!');
}

// Run the function
getExactPolicyNames().catch(console.error);