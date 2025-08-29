import { supabase } from './supabase-admin.js';

async function checkAdminsStructure() {
  console.log('🔍 Checking admins structure in database...\n');
  
  try {
    // Check if admins is a table or view
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'admins')
      .single();
    
    if (tableInfo) {
      console.log(`✅ Found 'admins' as a ${tableInfo.table_type}`);
      
      if (tableInfo.table_type === 'VIEW') {
        console.log('   It\'s a VIEW, not a table - cannot alter RLS on it');
        
        // Try to get the view definition
        const { data: viewDef } = await supabase
          .from('information_schema.views')
          .select('view_definition')
          .eq('table_schema', 'public')
          .eq('table_name', 'admins')
          .single();
        
        if (viewDef) {
          console.log('\nView definition:');
          console.log(viewDef.view_definition);
        }
      }
    } else {
      console.log('❌ No admins table or view found');
    }
    
    // Check profiles table for is_admin column
    console.log('\n🔍 Checking profiles table structure...\n');
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')
      .in('column_name', ['is_admin', 'beta_access', 'email'])
      .order('column_name');
    
    if (columns && columns.length > 0) {
      console.log('Profiles table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
    
    // Try to query admins view/table
    console.log('\n🔍 Trying to query admins...\n');
    
    const { data: admins, error: adminsError } = await supabase
      .from('admins')
      .select('*')
      .limit(5);
    
    if (adminsError) {
      console.log('Error querying admins:', adminsError.message);
    } else if (admins) {
      console.log(`Found ${admins.length} admin records`);
      if (admins.length > 0) {
        console.log('Sample structure:', Object.keys(admins[0]));
      }
    }
    
    // Check how many users have is_admin = true
    console.log('\n🔍 Checking admin users in profiles...\n');
    
    const { count: adminCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', true);
    
    if (!countError) {
      console.log(`✅ Found ${adminCount} users with is_admin = true`);
    } else {
      console.log('Error counting admin users:', countError.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAdminsStructure().then(() => {
  console.log('\n✨ Check complete!');
});