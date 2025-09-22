#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function addPurchaseLink() {
  console.log('Adding purchase_link column to bag_equipment table...');

  try {
    // Add purchase_link column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE bag_equipment
        ADD COLUMN IF NOT EXISTS purchase_link TEXT;
      `
    });

    if (alterError) {
      console.error('Error adding column:', alterError);
      return;
    }

    // Add comment
    const { error: commentError } = await supabase.rpc('exec_sql', {
      sql: `
        COMMENT ON COLUMN bag_equipment.purchase_link IS 'URL where the user purchased this equipment';
      `
    });

    if (commentError) {
      console.error('Error adding comment:', commentError);
      // Non-critical, continue
    }

    // Verify the column exists
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'bag_equipment' 
        AND column_name = 'purchase_link'
        LIMIT 1;
      `
    });

    if (error) {
      console.error('Error verifying column:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Successfully added purchase_link column to bag_equipment table');
    } else {
      console.error('❌ Failed to add purchase_link column');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

addPurchaseLink();