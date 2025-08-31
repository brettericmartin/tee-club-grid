import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Use service key to bypass RLS
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Use anon key to test with RLS
const supabaseAnon = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkRLS() {
  console.log('Checking RLS policies on equipment table...\n');
  
  // Check with service key (bypasses RLS)
  const { count: adminCount } = await supabaseAdmin
    .from('equipment')
    .select('*', { count: 'exact', head: true });
    
  console.log(`Equipment count (Admin/No RLS): ${adminCount}`);
  
  // Check with anon key (subject to RLS)
  const { count: anonCount } = await supabaseAnon
    .from('equipment')
    .select('*', { count: 'exact', head: true });
    
  console.log(`Equipment count (Anon/With RLS): ${anonCount}`);
  
  if (adminCount > 0 && anonCount === 0) {
    console.log('\n❌ RLS is blocking anonymous access to equipment table!');
    console.log('This is why the equipment page shows no items.');
  } else if (adminCount === anonCount) {
    console.log('\n✅ RLS is allowing access properly');
  }
  
  // Check bag_equipment similarly
  console.log('\n\nChecking bag_equipment table...');
  
  const { count: bagAdminCount } = await supabaseAdmin
    .from('bag_equipment')
    .select('*', { count: 'exact', head: true });
    
  console.log(`Bag equipment count (Admin/No RLS): ${bagAdminCount}`);
  
  const { count: bagAnonCount } = await supabaseAnon
    .from('bag_equipment')
    .select('*', { count: 'exact', head: true });
    
  console.log(`Bag equipment count (Anon/With RLS): ${bagAnonCount}`);
  
  if (bagAdminCount > 0 && bagAnonCount === 0) {
    console.log('\n❌ RLS is blocking anonymous access to bag_equipment table!');
  }
}

checkRLS().catch(console.error);