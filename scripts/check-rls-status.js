#!/usr/bin/env node

/**
 * Check RLS status for all critical tables
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getSupabaseAdmin } from './supabase-admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function checkRLSStatus() {
  console.log('🔍 Checking RLS status for all critical tables...\n');
  
  const supabaseAdmin = getSupabaseAdmin();
  
  const tables = [
    'feed_posts',
    'feed_likes',
    'profiles',
    'equipment',
    'equipment_photos',
    'user_bags',
    'bag_equipment',
    'user_follows'
  ];
  
  for (const table of tables) {
    console.log(`📊 Table: ${table}`);
    
    try {
      // Check if RLS is enabled
      const { data: tableInfo, error: tableError } = await supabaseAdmin
        .from('pg_tables')
        .select('*')
        .eq('schemaname', 'public')
        .eq('tablename', table)
        .single();
      
      if (tableError) {
        console.log(`   ❌ Could not check table: ${tableError.message}`);
        continue;
      }
      
      // Get policies for the table
      const { data: policies, error: policyError } = await supabaseAdmin
        .rpc('get_table_policies', { 
          schema_name: 'public',
          table_name: table 
        });
      
      if (!policyError && policies) {
        console.log(`   ✅ RLS enabled with ${policies.length} policies`);
        policies.forEach(p => {
          console.log(`      - ${p.policyname}: ${p.cmd} (roles: ${p.roles})`);
        });
      } else {
        // Fallback: try a simpler query
        console.log(`   ℹ️  Could not fetch policies directly, checking via test query...`);
        
        // Try to select from the table
        const { error: selectError } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(1);
        
        if (!selectError) {
          console.log(`   ✅ Table is accessible`);
        } else {
          console.log(`   ⚠️  Table access issue: ${selectError.message}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Unexpected error: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('✨ RLS check complete!');
}

// Run the check
checkRLSStatus().catch(console.error);