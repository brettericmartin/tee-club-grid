import { supabase } from './supabase-admin.js';

async function checkWaitlistColumns() {
  console.log('📋 Checking waitlist_applications table structure...\n');

  // Get table columns
  const { data: columns, error } = await supabase.rpc('run_sql', {
    query: `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'waitlist_applications'
      ORDER BY ordinal_position
    `
  });

  if (columns) {
    console.log('Table Columns:');
    const parsed = typeof columns === 'string' ? JSON.parse(columns) : columns;
    if (Array.isArray(parsed)) {
      parsed.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
      });
    } else {
      console.log(parsed);
    }
  }

  // Get RLS policies
  console.log('\n📜 RLS Policies:');
  const { data: policies } = await supabase.rpc('run_sql', {
    query: `
      SELECT 
        polname as policy_name,
        CASE polcmd
          WHEN 'r' THEN 'SELECT'
          WHEN 'a' THEN 'INSERT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'd' THEN 'DELETE'
          WHEN '*' THEN 'ALL'
        END as operation
      FROM pg_policy pol
      JOIN pg_class cls ON pol.polrelid = cls.oid
      WHERE cls.relname = 'waitlist_applications'
    `
  });

  if (policies) {
    const parsed = typeof policies === 'string' ? JSON.parse(policies) : policies;
    if (Array.isArray(parsed)) {
      parsed.forEach(p => {
        console.log(`  - ${p.policy_name}: ${p.operation}`);
      });
    } else {
      console.log(parsed);
    }
  }
}

checkWaitlistColumns();