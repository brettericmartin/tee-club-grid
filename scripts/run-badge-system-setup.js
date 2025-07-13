#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Setting up badge system for Teed.club...\n');

// Check if we should use the SQL file or the JS script
const useSqlFile = process.argv.includes('--sql');

if (useSqlFile) {
  console.log('Using SQL file method...');
  console.log('Please run the following SQL file in your Supabase dashboard:');
  console.log(`\nFile: ${path.join(__dirname, '..', 'supabase', 'create-badge-system.sql')}\n`);
  console.log('Steps:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to the SQL Editor');
  console.log('3. Copy and paste the contents of the SQL file');
  console.log('4. Click "Run" to execute the script');
} else {
  console.log('Using JavaScript method...');
  console.log('Running badge system setup script...\n');
  
  try {
    execSync('node scripts/create-badge-system.js', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('\n✅ Badge system setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Visit /badges to see your badge collection');
    console.log('2. Add equipment to your bag to earn badges');
    console.log('3. Write reviews and upload photos to unlock more badges');
  } catch (error) {
    console.error('\n❌ Badge system setup failed!');
    console.error('Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure your Supabase credentials are set in .env');
    console.log('2. Try running with --sql flag to use SQL file method');
    console.log('3. Check the error message above for details');
    process.exit(1);
  }
}

console.log('\n📚 Documentation:');
console.log('- Badge categories: equipment_explorer, social_golfer, gear_collector, community_contributor, milestone_achievement');
console.log('- Badge tiers: bronze, silver, gold, platinum, diamond');
console.log('- Badges are automatically checked when users perform relevant actions');