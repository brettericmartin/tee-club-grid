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

async function importScrapedEquipment() {
  console.log('📥 Starting Equipment Import Process...\n');
  
  try {
    // Find available JSON files
    const scrapedDataDir = path.join(__dirname, 'scraped-data');
    let files = [];
    
    try {
      files = await fs.readdir(scrapedDataDir);
      files = files.filter(f => f.endsWith('.json'));
    } catch (error) {
      console.error('❌ No scraped data directory found');
      console.log('Please run one of the scraping scripts first:');
      console.log('  npm run scrape:golf');
      console.log('  npm run scrape:2ndswing');
      console.log('  npm run scrape:equipment');
      process.exit(1);
    }
    
    if (files.length === 0) {
      console.error('❌ No JSON files found in scraped-data directory');
      console.log('Please run a scraping script first');
      process.exit(1);
    }
    
    console.log('Found data files:');
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    
    // Process each file
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    for (const file of files) {
      console.log(`\n📄 Processing ${file}...`);
      
      const filePath = path.join(scrapedDataDir, file);
      const jsonData = await fs.readFile(filePath, 'utf-8');
      const equipment = JSON.parse(jsonData);
      
      console.log(`Found ${equipment.length} items in ${file}`);
      
      // Check for existing items
      const brands = [...new Set(equipment.map(e => e.brand))];
      const models = [...new Set(equipment.map(e => e.model))];
      
      const { data: existingEquipment } = await supabase
        .from('equipment')
        .select('brand, model')
        .in('brand', brands)
        .in('model', models);
      
      const existingSet = new Set(
        (existingEquipment || []).map(e => `${e.brand}-${e.model}`.toLowerCase())
      );
      
      // Prepare items for import
      const itemsToImport = [];
      let fileSkipped = 0;
      
      for (const item of equipment) {
        const itemKey = `${item.brand}-${item.model}`.toLowerCase();
        
        if (existingSet.has(itemKey)) {
          fileSkipped++;
          continue;
        }
        
        // Transform data for database
        const dbItem = {
          brand: item.brand,
          model: item.model,
          category: item.category,
          msrp: item.msrp || null,
          specs: item.specs || {},
          image_url: item.image_url || null,
          description: item.description || null,
          popularity_score: item.popularity_score || 75,
          release_year: item.specs?.year || null,
          created_at: new Date().toISOString()
        };
        
        // Add condition data if from 2nd Swing
        if (item.condition) {
          dbItem.specs.condition = item.condition;
          dbItem.specs.original_msrp = item.original_msrp;
          dbItem.specs.savings_percent = item.savings_percent;
        }
        
        itemsToImport.push(dbItem);
      }
      
      console.log(`  - ${itemsToImport.length} new items to import`);
      console.log(`  - ${fileSkipped} duplicates skipped`);
      
      // Import in batches
      if (itemsToImport.length > 0) {
        const batchSize = 50;
        const batches = [];
        
        for (let i = 0; i < itemsToImport.length; i += batchSize) {
          batches.push(itemsToImport.slice(i, i + batchSize));
        }
        
        console.log(`  - Importing in ${batches.length} batches...`);
        
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const { data, error } = await supabase
            .from('equipment')
            .insert(batch)
            .select();
          
          if (error) {
            console.error(`  ❌ Batch ${i + 1} error:`, error.message);
            totalErrors += batch.length;
          } else {
            console.log(`  ✅ Batch ${i + 1}/${batches.length} imported (${data.length} items)`);
            totalImported += data.length;
          }
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      totalSkipped += fileSkipped;
    }
    
    // Final summary
    console.log('\n📊 Import Summary:');
    console.log(`✅ Successfully imported: ${totalImported} items`);
    console.log(`⏭️  Skipped (duplicates): ${totalSkipped} items`);
    console.log(`❌ Errors: ${totalErrors} items`);
    
    // Check final count
    const { count } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📈 Total equipment in database: ${count} items`);
    
    // Category breakdown
    const { data: categories } = await supabase
      .from('equipment')
      .select('category')
      .not('category', 'is', null);
    
    if (categories) {
      const categoryCounts = categories.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\nCategory breakdown:');
      Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([cat, count]) => {
          console.log(`  ${cat}: ${count} items`);
        });
    }
    
    console.log('\n✨ Import complete!');
    console.log('\nNext steps:');
    console.log('1. Run "npm run collect:screenshots" to collect equipment images');
    console.log('2. View equipment at http://localhost:3333/equipment');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the import
importScrapedEquipment().catch(console.error);