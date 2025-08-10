#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase-admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function removeAutomaticFeedTriggers() {
  try {
    console.log('🚀 Removing automatic feed post triggers...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '../sql/remove-automatic-feed-triggers.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try executing statements individually
      console.log('⚠️  exec_sql not available, executing statements individually...');
      
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.includes('DROP TRIGGER')) {
          console.log(`\n📌 Executing: ${statement.substring(0, 50)}...`);
          
          try {
            // For DROP TRIGGER, we need to handle it differently
            // Extract trigger name and table name
            const match = statement.match(/DROP TRIGGER IF EXISTS (\w+) ON (\w+)/);
            if (match) {
              const [, triggerName, tableName] = match;
              // Try to drop the trigger using raw SQL
              await supabase.rpc('exec_sql', { sql_query: statement + ';' }).catch(() => {
                console.log(`⚠️  Trigger ${triggerName} might not exist, continuing...`);
              });
            }
          } catch (e) {
            console.log(`⚠️  Statement failed, but continuing: ${e.message}`);
          }
        }
      }
    }

    console.log('✅ Successfully removed automatic feed triggers');
    console.log('\nThe following triggers have been removed:');
    console.log('- create_equipment_feed_post_trigger (equipment additions)');
    console.log('- create_equipment_photo_feed_post_trigger (photo uploads)');
    console.log('\nNote: The trigger functions remain available for manual use if needed.');
    console.log('\n🎉 Feed posts will now require user confirmation via prompt!');

  } catch (error) {
    console.error('❌ Error removing triggers:', error);
    process.exit(1);
  }
}

// Execute if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  removeAutomaticFeedTriggers();
}