import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Equipment Batch Collector
 * 
 * Processes batches of equipment data for import into Teed.club database
 * Validates, deduplicates, and prepares data for insertion
 */

// Standardized categories from equipment-categories.ts
const VALID_CATEGORIES = [
  'driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter',
  'shaft', 'grip', 'ball', 'bag', 'glove', 'rangefinder', 'gps',
  'tee', 'towel', 'ball_marker', 'divot_tool', 'accessories'
];

// Validation schema for equipment data
const EQUIPMENT_SCHEMA = {
  required: ['brand', 'model', 'category'],
  optional: ['msrp', 'release_year', 'specs', 'description', 'image_url', 'tour_usage', 'key_features']
};

/**
 * Validate equipment data structure
 */
function validateEquipment(item, index) {
  const errors = [];
  
  // Check required fields
  EQUIPMENT_SCHEMA.required.forEach(field => {
    if (!item[field]) {
      errors.push(`Item ${index}: Missing required field '${field}'`);
    }
  });
  
  // Validate category
  if (item.category && !VALID_CATEGORIES.includes(item.category)) {
    errors.push(`Item ${index}: Invalid category '${item.category}'. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  
  // Validate brand doesn't appear in model
  if (item.brand && item.model && item.model.toLowerCase().includes(item.brand.toLowerCase())) {
    errors.push(`Item ${index}: Model '${item.model}' should not include brand name '${item.brand}'`);
  }
  
  // Validate MSRP is a number
  if (item.msrp && (typeof item.msrp !== 'number' || item.msrp <= 0)) {
    errors.push(`Item ${index}: MSRP must be a positive number`);
  }
  
  // Validate release_year
  if (item.release_year) {
    const year = parseInt(item.release_year);
    if (isNaN(year) || year < 2000 || year > new Date().getFullYear() + 1) {
      errors.push(`Item ${index}: Invalid release_year '${item.release_year}'`);
    }
  }
  
  // Validate image URL format
  if (item.image_url && !item.image_url.match(/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i)) {
    errors.push(`Item ${index}: Image URL should be a direct link to an image file`);
  }
  
  return errors;
}

/**
 * Check for duplicates in database
 */
async function checkDuplicates(items) {
  const duplicates = [];
  
  for (const item of items) {
    // Check for exact brand + model match
    const { data: existing } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .eq('brand', item.brand)
      .eq('model', item.model)
      .single();
    
    if (existing) {
      duplicates.push({
        new_item: item,
        existing_item: existing,
        reason: 'Exact brand and model match'
      });
    }
  }
  
  return duplicates;
}

/**
 * Process a batch of equipment data
 */
async function processBatch(batchFile) {
  console.log(`\n📦 Processing batch: ${batchFile}`);
  console.log('='.repeat(50));
  
  try {
    // Read batch file
    const batchPath = path.join(__dirname, '..', 'data', 'equipment-batches', batchFile);
    const rawData = await fs.readFile(batchPath, 'utf-8');
    let batchData = JSON.parse(rawData);
    
    console.log(`Found ${batchData.length} items in batch\n`);
    
    // Validate all items
    console.log('🔍 Validating equipment data...');
    const validationErrors = [];
    batchData.forEach((item, index) => {
      const errors = validateEquipment(item, index);
      validationErrors.push(...errors);
    });
    
    if (validationErrors.length > 0) {
      console.error('\n❌ Validation errors found:');
      validationErrors.forEach(error => console.error(`  - ${error}`));
      return { success: false, errors: validationErrors };
    }
    
    console.log('✅ All items passed validation\n');
    
    // Check for duplicates
    console.log('🔍 Checking for duplicates...');
    const duplicates = await checkDuplicates(batchData);
    
    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.length} potential duplicates:`);
      duplicates.forEach(dup => {
        console.log(`  - ${dup.new_item.brand} ${dup.new_item.model} (${dup.reason})`);
      });
      
      // Filter out duplicates
      const duplicateKeys = new Set(duplicates.map(d => `${d.new_item.brand}-${d.new_item.model}`));
      batchData = batchData.filter(item => !duplicateKeys.has(`${item.brand}-${item.model}`));
      console.log(`\nContinuing with ${batchData.length} non-duplicate items`);
    } else {
      console.log('✅ No duplicates found\n');
    }
    
    if (batchData.length === 0) {
      console.log('⚠️  No items to import after duplicate removal');
      return { success: true, imported: 0 };
    }
    
    // Prepare for import
    console.log('📝 Preparing items for import...');
    const importData = batchData.map(item => ({
      brand: item.brand.trim(),
      model: item.model.trim(),
      category: item.category,
      msrp: item.msrp || null,
      release_year: item.release_year || null,
      specs: item.specs || {},
      description: item.description || null,
      image_url: item.image_url || null,
      added_by_user_id: null, // System import
      verified: false // Mark as unverified initially
    }));
    
    // Insert into database
    console.log('💾 Inserting into database...');
    const { data, error } = await supabase
      .from('equipment')
      .insert(importData)
      .select();
    
    if (error) {
      console.error('❌ Database error:', error);
      return { success: false, error };
    }
    
    console.log(`\n✅ Successfully imported ${data.length} items!`);
    
    // Show summary
    const categoryCounts = {};
    data.forEach(item => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });
    
    console.log('\n📊 Import Summary:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count} items`);
    });
    
    return { success: true, imported: data.length, data };
    
  } catch (error) {
    console.error('❌ Error processing batch:', error.message);
    return { success: false, error };
  }
}

/**
 * List available batches
 */
async function listBatches() {
  const batchDir = path.join(__dirname, '..', 'data', 'equipment-batches');
  
  try {
    await fs.access(batchDir);
    const files = await fs.readdir(batchDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      console.log('No batch files found in data/equipment-batches/');
      console.log('Create batch files like: batch-001-drivers.json');
      return [];
    }
    
    console.log('\n📁 Available batch files:');
    jsonFiles.forEach(file => console.log(`  - ${file}`));
    
    return jsonFiles;
  } catch (error) {
    console.log('Creating equipment-batches directory...');
    await fs.mkdir(batchDir, { recursive: true });
    console.log('Created data/equipment-batches/ directory');
    console.log('Add batch JSON files here for processing');
    return [];
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🏌️ Equipment Batch Collector for Teed.club');
  console.log('=========================================\n');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--list') {
    // List available batches
    await listBatches();
    console.log('\nUsage: node scripts/collect-equipment-batch.js <batch-file.json>');
    console.log('   or: node scripts/collect-equipment-batch.js --all');
  } else if (args[0] === '--all') {
    // Process all batches
    const batches = await listBatches();
    let totalImported = 0;
    
    for (const batch of batches) {
      const result = await processBatch(batch);
      if (result.success) {
        totalImported += result.imported;
      }
    }
    
    console.log(`\n🎉 Total items imported: ${totalImported}`);
  } else {
    // Process specific batch
    const result = await processBatch(args[0]);
    if (!result.success) {
      process.exit(1);
    }
  }
}

main().catch(console.error);