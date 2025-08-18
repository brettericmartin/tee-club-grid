#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function importDriverBatch() {
  console.log('🏌️ Importing Top 5 2024 Drivers Batch');
  console.log('=====================================\n');

  try {
    // Read the batch data
    const batchPath = path.join(process.cwd(), 'data/equipment-batches/batch-001-top-drivers-2024.json');
    const batchData = JSON.parse(fs.readFileSync(batchPath, 'utf8'));

    console.log(`📊 Batch Info:`);
    console.log(`   Name: ${batchData.batch_info.name}`);
    console.log(`   Created: ${batchData.batch_info.created_date}`);
    console.log(`   Items: ${batchData.equipment.length}`);
    console.log(`   Sources: ${batchData.batch_info.sources.length}\n`);

    // Validation checks
    const validationErrors = [];
    
    for (const item of batchData.equipment) {
      // Check required fields
      if (!item.brand || !item.model || !item.category) {
        validationErrors.push(`Missing required fields for ${item.brand || 'Unknown'} ${item.model || 'Unknown'}`);
      }
      
      // Check category is 'driver'
      if (item.category !== 'driver') {
        validationErrors.push(`Invalid category '${item.category}' for ${item.brand} ${item.model}`);
      }
      
      // Check MSRP is reasonable
      if (!item.msrp || item.msrp < 300 || item.msrp > 1000) {
        validationErrors.push(`Invalid MSRP $${item.msrp} for ${item.brand} ${item.model}`);
      }
      
      // Check specs are present
      if (!item.specs || Object.keys(item.specs).length < 5) {
        validationErrors.push(`Insufficient specs for ${item.brand} ${item.model}`);
      }
      
      // Check key features
      if (!item.key_features || item.key_features.length < 3) {
        validationErrors.push(`Insufficient key features for ${item.brand} ${item.model}`);
      }
    }

    if (validationErrors.length > 0) {
      console.log('❌ Validation Errors:');
      validationErrors.forEach(error => console.log(`   • ${error}`));
      console.log('\n🛑 Import aborted due to validation errors.\n');
      return;
    }

    console.log('✅ Validation passed. Checking for duplicates...\n');

    // Check for existing equipment
    const existingChecks = [];
    for (const item of batchData.equipment) {
      const { data: existing } = await supabase
        .from('equipment')
        .select('id, brand, model, category, msrp, release_year')
        .eq('brand', item.brand)
        .eq('model', item.model)
        .eq('category', 'driver');
      
      if (existing && existing.length > 0) {
        existingChecks.push({
          item,
          existing: existing[0],
          action: 'update'
        });
      } else {
        existingChecks.push({
          item,
          existing: null,
          action: 'insert'
        });
      }
    }

    // Show import plan
    console.log('📋 Import Plan:');
    const inserts = existingChecks.filter(check => check.action === 'insert');
    const updates = existingChecks.filter(check => check.action === 'update');
    
    console.log(`   New records to insert: ${inserts.length}`);
    console.log(`   Existing records to update: ${updates.length}\n`);

    if (inserts.length > 0) {
      console.log('🆕 New Records:');
      inserts.forEach(check => {
        console.log(`   • ${check.item.brand} ${check.item.model} - $${check.item.msrp}`);
      });
      console.log('');
    }

    if (updates.length > 0) {
      console.log('🔄 Records to Update:');
      updates.forEach(check => {
        console.log(`   • ${check.item.brand} ${check.item.model}`);
        console.log(`     Current MSRP: $${check.existing.msrp} → New: $${check.item.msrp}`);
        console.log(`     Current Year: ${check.existing.release_year || 'Missing'} → New: ${check.item.release_year}`);
      });
      console.log('');
    }

    // Prompt for confirmation (in production, you'd want interactive confirmation)
    console.log('⚠️ CONFIRMATION REQUIRED');
    console.log('This script will modify the equipment database.');
    console.log('In production, you should manually review and confirm these changes.\n');

    // For now, just show what would be done
    console.log('🧪 DRY RUN MODE - No changes will be made');
    console.log('To actually import, uncomment the execution section below.\n');

    /*
    // UNCOMMENT TO ACTUALLY PERFORM IMPORT:
    
    console.log('🚀 Starting import...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const check of existingChecks) {
      try {
        if (check.action === 'insert') {
          const { error } = await supabase
            .from('equipment')
            .insert({
              brand: check.item.brand,
              model: check.item.model,
              category: check.item.category,
              msrp: check.item.msrp,
              release_year: check.item.release_year,
              specs: check.item.specs,
              description: check.item.description,
              tour_usage: check.item.tour_usage || [],
              key_features: check.item.key_features || [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (error) throw error;
          console.log(`✅ Inserted: ${check.item.brand} ${check.item.model}`);
          
        } else if (check.action === 'update') {
          const { error } = await supabase
            .from('equipment')
            .update({
              msrp: check.item.msrp,
              release_year: check.item.release_year,
              specs: check.item.specs,
              description: check.item.description,
              tour_usage: check.item.tour_usage || [],
              key_features: check.item.key_features || [],
              updated_at: new Date().toISOString()
            })
            .eq('id', check.existing.id);

          if (error) throw error;
          console.log(`🔄 Updated: ${check.item.brand} ${check.item.model}`);
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error processing ${check.item.brand} ${check.item.model}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    */

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
  }
}

// Run the import
importDriverBatch().catch(console.error);