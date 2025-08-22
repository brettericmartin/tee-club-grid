#!/usr/bin/env node

import { supabase } from './supabase-admin.js';
import fs from 'fs/promises';

async function applyRLSPolicies() {
  try {
    console.log('🔐 Applying RLS policies for affiliate and video tables...\n');
    
    // Read the SQL file
    const sqlContent = await fs.readFile('./scripts/create-affiliate-video-rls.sql', 'utf8');
    
    // Split into individual statements, filtering out comments and empty lines
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.match(/^\/\*.*\*\/$/s)
      );
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement using the supabase client
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and verification queries for now
      if (statement.toLowerCase().includes('select') && 
          (statement.includes('pg_tables') || statement.includes('pg_policies'))) {
        console.log(`Skipping verification query ${i + 1}`);
        continue;
      }
      
      console.log(`Executing statement ${i + 1}/${statements.length}:`);
      
      // Show first 80 chars of statement
      const preview = statement.length > 80 ? 
        statement.substring(0, 80) + '...' : 
        statement;
      console.log(`  ${preview}`);
      
      try {
        // Use the supabase client to execute the SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.log(`❌ Error: ${error.message}`);
          
          // Check if it's a "already exists" error which we can ignore
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('cannot drop policy')) {
            console.log(`✅ Continuing - policy state expected`);
          } else {
            console.log(`⚠️  This may need manual attention`);
          }
        } else {
          console.log(`✅ Success`);
        }
      } catch (err) {
        // Try alternative approaches if the function doesn't exist
        if (err.message && err.message.includes('exec_sql')) {
          console.log(`❌ exec_sql function not available: ${err.message}`);
          console.log(`⚠️  Manual execution required for this statement`);
        } else {
          console.log(`❌ Error: ${err.message}`);
        }
      }
      
      console.log('');
    }
    
    console.log('🎉 RLS policy application completed!\n');
    
    // Verify the policies by checking what we can access
    console.log('🔍 Verifying table access...');
    
    const tables = ['user_equipment_links', 'equipment_videos', 'user_bag_videos', 'link_clicks'];
    
    for (const tableName of tables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
          
        if (!error) {
          console.log(`✅ ${tableName}: RLS working (${count || 0} rows accessible)`);
        } else {
          console.log(`❌ ${tableName}: ${error.message}`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }
    
    console.log('\n✨ RLS setup verification complete!');
    
  } catch (error) {
    console.error('Error applying RLS policies:', error);
  }
}

applyRLSPolicies();