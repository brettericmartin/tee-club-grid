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

async function setupScraperEnvironment() {
  console.log('🔧 Setting up scraper environment...\n');

  try {
    // 1. Check environment variables
    console.log('1️⃣ Checking environment variables...');
    const requiredEnvVars = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing environment variables:', missingVars);
      console.log('\nPlease add these to your .env.local file');
      process.exit(1);
    }
    console.log('✅ Environment variables configured\n');

    // 2. Verify database connection
    console.log('2️⃣ Testing database connection...');
    const { data: tables, error: tablesError } = await supabase
      .from('equipment')
      .select('id')
      .limit(1);

    if (tablesError) {
      console.error('❌ Database connection failed:', tablesError.message);
      process.exit(1);
    }
    console.log('✅ Database connection successful\n');

    // 3. Check equipment table schema
    console.log('3️⃣ Verifying equipment table schema...');
    const { data: columns, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'equipment' })
      .select('*');

    if (schemaError && schemaError.code !== 'PGRST202') {
      // Try alternative method
      const { data: sampleRow } = await supabase
        .from('equipment')
        .select('*')
        .limit(1);
      
      if (sampleRow && sampleRow.length > 0) {
        console.log('✅ Equipment table exists with columns:', Object.keys(sampleRow[0]));
      } else {
        console.log('⚠️  Equipment table exists but is empty');
      }
    } else if (columns) {
      console.log('✅ Equipment table columns:', columns.map(c => c.column_name).join(', '));
    }

    // 4. Check storage buckets
    console.log('\n4️⃣ Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.error('⚠️  Could not list storage buckets:', bucketsError.message);
    } else {
      const equipmentBuckets = buckets.filter(b => 
        b.name === 'equipment-images' || b.name === 'equipment-photos'
      );
      
      if (equipmentBuckets.length === 0) {
        console.log('⚠️  No equipment image buckets found');
        console.log('   Creating equipment-images bucket...');
        
        const { error: createError } = await supabase.storage.createBucket('equipment-images', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        });
        
        if (createError) {
          console.error('   ❌ Failed to create bucket:', createError.message);
        } else {
          console.log('   ✅ Created equipment-images bucket');
        }
      } else {
        console.log('✅ Storage buckets found:', equipmentBuckets.map(b => b.name).join(', '));
      }
    }

    // 5. Create data directories
    console.log('\n5️⃣ Setting up local directories...');
    const directories = [
      path.join(__dirname, 'scraped-data'),
      path.join(__dirname, 'temp-images'),
      path.join(__dirname, 'logs')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`✅ Created directory: ${path.basename(dir)}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          console.error(`❌ Failed to create directory ${dir}:`, error.message);
        }
      }
    }

    // 6. Check current equipment count
    console.log('\n6️⃣ Checking current equipment data...');
    const { count, error: countError } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`📊 Current equipment count: ${count} items`);
      
      // Get category breakdown
      const { data: categories } = await supabase
        .from('equipment')
        .select('category')
        .not('category', 'is', null);
      
      if (categories) {
        const categoryCounts = categories.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {});
        
        console.log('\n📈 Category breakdown:');
        Object.entries(categoryCounts).forEach(([cat, count]) => {
          console.log(`   ${cat}: ${count} items`);
        });
      }
    }

    // 7. Check dependencies
    console.log('\n7️⃣ Checking Node.js dependencies...');
    try {
      await import('puppeteer');
      console.log('✅ puppeteer installed');
    } catch {
      console.log('⚠️  puppeteer not installed (required for screenshot collection)');
      console.log('   Run: npm install puppeteer');
    }

    try {
      await import('sharp');
      console.log('✅ sharp installed');
    } catch {
      console.log('⚠️  sharp not installed (required for image processing)');
      console.log('   Run: npm install sharp');
    }

    console.log('\n✨ Scraper environment setup complete!');
    console.log('\nAvailable commands:');
    console.log('  npm run scrape:golf       - Scrape Golf Galaxy equipment');
    console.log('  npm run scrape:2ndswing   - Scrape 2nd Swing Golf equipment');
    console.log('  npm run scrape:images     - Download equipment images');
    console.log('  npm run scrape:import     - Import scraped data to database');
    console.log('  npm run scrape:all        - Run complete pipeline');
    console.log('\nQuick start:');
    console.log('  node scripts/seed-equipment-bulk.js   - Generate 500+ items instantly');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setupScraperEnvironment().catch(console.error);