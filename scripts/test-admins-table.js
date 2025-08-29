import { supabase } from './supabase-admin.js';

async function testAdminsTable() {
  console.log('Testing admins object...\n');
  
  // Test 1: Try to query admins
  const { data: adminData, error: adminError } = await supabase
    .from('admins')
    .select('*')
    .limit(1);
  
  console.log('SELECT from admins:');
  if (adminError) {
    console.log('  Error:', adminError.message);
  } else {
    console.log('  Success - returned', adminData?.length || 0, 'rows');
    if (adminData && adminData.length > 0) {
      console.log('  Columns:', Object.keys(adminData[0]).join(', '));
    }
  }
  
  // Test 2: Try to insert into admins (this will tell us if it's a view)
  console.log('\nINSERT into admins (dry run):');
  const { error: insertError } = await supabase
    .from('admins')
    .insert({ user_id: '00000000-0000-0000-0000-000000000000' })
    .select();
  
  if (insertError) {
    console.log('  Error:', insertError.message);
    if (insertError.message.includes('cannot insert into view')) {
      console.log('  → admins is a VIEW');
    } else if (insertError.message.includes('cannot be performed on relation')) {
      console.log('  → admins is a VIEW (RLS operation not supported)');
    } else {
      console.log('  → admins is likely a TABLE with RLS restrictions');
    }
  } else {
    console.log('  → admins is a TABLE');
  }
  
  // Test 3: Check the actual definition
  console.log('\nChecking object definition:');
  const { data: defData, error: defError } = await supabase
    .from('pg_views')
    .select('viewname')
    .eq('schemaname', 'public')
    .eq('viewname', 'admins')
    .single();
  
  if (!defError && defData) {
    console.log('  ✓ admins is confirmed as a VIEW in pg_views');
  } else {
    console.log('  admins is not in pg_views, checking pg_tables...');
    
    const { data: tableData, error: tableError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'admins')
      .single();
    
    if (!tableError && tableData) {
      console.log('  ✓ admins is confirmed as a TABLE in pg_tables');
    } else {
      console.log('  Could not determine object type from system catalogs');
    }
  }
}

testAdminsTable();
