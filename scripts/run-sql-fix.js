import { supabase } from './supabase-admin.js';

async function runSQLFix() {
  console.log('🔧 FIXING MISSING COLUMNS IN WAITLIST_APPLICATIONS\n');
  
  try {
    // Add updated_at column
    console.log('Adding updated_at column...');
    const { error: col1Error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE waitlist_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`
    });
    
    if (col1Error && !col1Error.message.includes('already exists')) {
      console.log('Note: Could not add updated_at via RPC, may need manual SQL execution');
    } else {
      console.log('✅ updated_at column ready');
    }
    
    // Add approved_at column
    console.log('Adding approved_at column...');
    const { error: col2Error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE waitlist_applications ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;`
    });
    
    if (col2Error && !col2Error.message.includes('already exists')) {
      console.log('Note: Could not add approved_at via RPC, may need manual SQL execution');
    } else {
      console.log('✅ approved_at column ready');
    }
    
    // Check current columns
    console.log('\nVerifying columns in waitlist_applications:');
    const { data: waitlist, error: waitlistError } = await supabase
      .from('waitlist_applications')
      .select('*')
      .limit(1);
    
    if (waitlist && waitlist.length > 0) {
      const columns = Object.keys(waitlist[0]);
      console.log('Current columns:', columns.join(', '));
      
      if (columns.includes('updated_at') && columns.includes('approved_at')) {
        console.log('✅ All required columns present!');
      } else {
        console.log('⚠️  Missing columns:');
        if (!columns.includes('updated_at')) console.log('  - updated_at');
        if (!columns.includes('approved_at')) console.log('  - approved_at');
        console.log('\n📝 Please run the SQL in: supabase/fix-waitlist-columns.sql');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n📝 Please run the SQL manually in Supabase dashboard:');
    console.log('File: supabase/fix-waitlist-columns.sql');
  }
}

runSQLFix();
