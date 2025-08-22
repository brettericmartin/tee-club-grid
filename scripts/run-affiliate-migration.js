#!/usr/bin/env node

import { supabase } from './supabase-admin.js';
import fs from 'fs/promises';

async function runAffiliateMigration() {
  try {
    console.log('🚀 Running affiliate video features migration...\n');
    
    // Read the SQL migration file
    const sqlContent = await fs.readFile('./scripts/add-affiliate-video-features.sql', 'utf8');
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.toLowerCase().includes('create table') || 
          statement.toLowerCase().includes('create index') ||
          statement.toLowerCase().includes('create policy') ||
          statement.toLowerCase().includes('alter table')) {
        
        console.log(`Executing statement ${i + 1}/${statements.length}:`);
        console.log(`${statement.substring(0, 100)}...`);
        
        try {
          const { error } = await supabase.rpc('execute_sql', {
            query: statement
          });
          
          if (error) {
            console.log(`❌ Error: ${error.message}`);
            if (error.message.includes('already exists')) {
              console.log(`✅ Skipping - already exists`);
            }
          } else {
            console.log(`✅ Success`);
          }
        } catch (err) {
          console.log(`❌ Error: ${err.message}`);
        }
        
        console.log('');
      }
    }
    
    console.log('🎉 Migration execution completed!');
    
    // Verify tables were created
    console.log('\n🔍 Verifying created tables...');
    
    const expectedTables = [
      'user_equipment_links',
      'equipment_videos', 
      'user_bag_videos',
      'link_clicks'
    ];
    
    for (const tableName of expectedTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
          
        if (!error) {
          console.log(`✅ ${tableName}: exists (${count || 0} rows)`);
        } else {
          console.log(`❌ ${tableName}: ${error.message}`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error running migration:', error);
  }
}

runAffiliateMigration();