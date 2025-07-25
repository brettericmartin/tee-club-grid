#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Main equipment scraper that runs other scrapers
console.log('🏌️ Golf Equipment Scraper Suite\n');
console.log('This script coordinates multiple equipment scrapers.\n');

const scrapers = [
  {
    name: 'Golf Equipment (Retail)',
    script: 'scrape-golf-equipment.js',
    description: 'Scrapes major golf retailers and manufacturers'
  },
  {
    name: '2nd Swing Golf (Used)',
    script: 'scrape-2ndswing.js',
    description: 'Scrapes used and discounted equipment'
  },
  {
    name: 'Multi-Source Aggregator',
    script: 'scrape-equipment-multi-source.js',
    description: 'Combines data from multiple sources with deduplication'
  }
];

console.log('Available scrapers:');
scrapers.forEach((scraper, index) => {
  console.log(`${index + 1}. ${scraper.name} - ${scraper.description}`);
});

// Get command line argument
const args = process.argv.slice(2);
const selectedOption = args[0];

async function runScraper(scraperScript) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scraperScript);
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Scraper exited with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runAllScrapers() {
  console.log('\n🚀 Running all scrapers in sequence...\n');
  
  for (const scraper of scrapers) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Starting: ${scraper.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    try {
      await runScraper(scraper.script);
      console.log(`\n✅ ${scraper.name} completed successfully`);
    } catch (error) {
      console.error(`\n❌ ${scraper.name} failed:`, error.message);
      console.log('Continuing with next scraper...');
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ All scrapers completed!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Next steps:');
  console.log('1. Run "npm run scrape:images" to download product images');
  console.log('2. Run "npm run scrape:import" to import data to database');
}

// Main execution
if (!selectedOption) {
  console.log('\nUsage:');
  console.log('  npm run scrape:equipment         # Run all scrapers');
  console.log('  npm run scrape:equipment 1       # Run Golf Equipment scraper only');
  console.log('  npm run scrape:equipment 2       # Run 2nd Swing scraper only');
  console.log('  npm run scrape:equipment 3       # Run Multi-Source scraper only');
  console.log('\nDefaulting to running all scrapers...');
  
  runAllScrapers().catch(console.error);
} else {
  const selected = parseInt(selectedOption);
  
  if (selected >= 1 && selected <= scrapers.length) {
    const scraper = scrapers[selected - 1];
    console.log(`\n🚀 Running ${scraper.name}...\n`);
    
    runScraper(scraper.script)
      .then(() => {
        console.log(`\n✅ ${scraper.name} completed successfully`);
        console.log('\nNext steps:');
        console.log('1. Run "npm run scrape:images" to download product images');
        console.log('2. Run "npm run scrape:import" to import data to database');
      })
      .catch((error) => {
        console.error(`\n❌ ${scraper.name} failed:`, error.message);
        process.exit(1);
      });
  } else {
    console.error(`\n❌ Invalid option: ${selectedOption}`);
    console.log('Please choose a number between 1 and', scrapers.length);
    process.exit(1);
  }
}