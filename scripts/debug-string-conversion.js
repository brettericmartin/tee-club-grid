// Debug script to find string conversion issues
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStringConversions() {
  console.log('Testing various string conversions that might cause Symbol errors...\n');

  // Test 1: User object
  console.log('Test 1: User object from auth');
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    console.log('User ID type:', typeof user.id);
    console.log('User ID:', user.id);
    console.log('String(user.id):', String(user.id));
    console.log('User object keys:', Object.keys(user));
    console.log('User has Symbol properties:', Object.getOwnPropertySymbols(user).length > 0);
  }

  // Test 2: Database query results
  console.log('\nTest 2: Database query results');
  const { data: bags, error } = await supabase
    .from('user_bags')
    .select('*')
    .limit(1);
  
  if (bags && bags.length > 0) {
    const bag = bags[0];
    console.log('Bag ID type:', typeof bag.id);
    console.log('Bag ID:', bag.id);
    console.log('String(bag.id):', String(bag.id));
    console.log('Bag has Symbol properties:', Object.getOwnPropertySymbols(bag).length > 0);
  }

  // Test 3: Array map operations
  console.log('\nTest 3: Array map operations');
  if (bags) {
    try {
      const ids = bags.map(bag => String(bag.id));
      console.log('Mapped IDs:', ids);
    } catch (err) {
      console.error('Error mapping IDs:', err);
    }
  }

  // Test 4: Template literals
  console.log('\nTest 4: Template literals');
  const testObj = { brand: 'Test', model: 'Model' };
  try {
    const str = `${testObj.brand} ${testObj.model}`;
    console.log('Template literal result:', str);
  } catch (err) {
    console.error('Error with template literal:', err);
  }

  // Test 5: Check for Symbol.toStringTag
  console.log('\nTest 5: Symbol.toStringTag');
  if (user) {
    console.log('User has Symbol.toStringTag:', Symbol.toStringTag in user);
    console.log('User toString():', user.toString());
  }
}

testStringConversions().catch(console.error);