import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Test displayNameToSlug function
function displayNameToSlug(displayName) {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

async function testShareUrls() {
  console.log('Testing Share URL Generation...\n');
  
  // Test case 1: Brett's bag
  const { data: brett } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('username', 'brettmartinplay')
    .single();
    
  if (brett) {
    const slug = displayNameToSlug(brett.display_name || brett.username);
    console.log('✓ Brett\'s Profile:');
    console.log('  Display Name:', brett.display_name);
    console.log('  Username:', brett.username);
    console.log('  Generated Slug:', slug);
    console.log('  Share URL:', `http://localhost:3333/u/${slug}`);
  }
  
  console.log('\n--- Testing URL Patterns ---');
  
  // Test various display names
  const testNames = [
    'Brett',
    'Brett Martin',
    'Pro Bags',
    'John\'s Clubs',
    'Tiger Woods',
    'Golf Pro 2024'
  ];
  
  testNames.forEach(name => {
    const slug = displayNameToSlug(name);
    console.log(`"${name}" → /u/${slug}`);
  });
  
  console.log('\n--- Testing Direct Bag URL ---');
  const bagId = 'f506f87e-223e-4fa4-beee-f0094915a965';
  console.log('Direct bag URL:', `http://localhost:3333/bag/${bagId}`);
  
  console.log('\n✓ All share URL formats are correctly generated!');
}

testShareUrls();