import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('Key:', supabaseAnonKey ? 'Set' : 'Not set');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('\n1. Testing basic connection...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('   Auth check:', sessionError ? `Error: ${sessionError.message}` : 'OK (no session)');
    
    console.log('\n2. Testing equipment table access...');
    const { data, error, count } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('   ❌ Error:', error.message);
      console.error('   Details:', error);
    } else {
      console.log('   ✅ Success! Table has', count, 'rows');
    }
    
    console.log('\n3. Testing actual data fetch...');
    const { data: items, error: fetchError } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .limit(5);
    
    if (fetchError) {
      console.error('   ❌ Error:', fetchError.message);
    } else {
      console.log('   ✅ Fetched', items?.length || 0, 'items');
      if (items && items.length > 0) {
        console.log('   Sample:', items[0]);
      }
    }
    
    console.log('\n4. Testing profiles table...');
    const { error: profileError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log('   Profiles table:', profileError ? `Error: ${profileError.message}` : 'Accessible');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

testConnection();