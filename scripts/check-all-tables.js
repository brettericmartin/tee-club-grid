#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMAs_hmJ9s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAllTables() {
  console.log('🔍 Getting all tables in the database...\n');
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (error) {
      console.error('Error fetching tables:', error);
      return;
    }
    
    console.log('📊 All tables in public schema:');
    console.log('=====================================');
    
    const tableNames = data.map(row => row.table_name);
    tableNames.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`);
    });
    
    console.log(`\n✅ Total tables: ${tableNames.length}`);
    
    // Check for any tables that might be related to affiliate links or videos
    const affiliateRelated = tableNames.filter(name => 
      name.includes('affiliate') || 
      name.includes('link') || 
      name.includes('video') || 
      name.includes('click')
    );
    
    if (affiliateRelated.length > 0) {
      console.log('\n🎯 Affiliate/Video related tables found:');
      affiliateRelated.forEach(name => console.log(`  - ${name}`));
    } else {
      console.log('\n❌ No affiliate/video related tables found');
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

getAllTables();