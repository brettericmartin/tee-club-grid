#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

// Parse the Supabase URL to get connection details
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

// For Supabase, we need to construct the direct PostgreSQL connection
// Supabase URL format: https://project-ref.supabase.co
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

const client = new Client({
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || 'your-db-password',
  ssl: {
    rejectUnauthorized: false
  }
});

async function executeSQL() {
  try {
    console.log('🔌 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully');

    console.log('📄 Reading SQL file...');
    const sql = fs.readFileSync('./sql/create-tees-tables.sql', 'utf8');
    
    console.log('🔧 Executing tees tables creation...');
    await client.query(sql);
    
    console.log('✅ SQL executed successfully!');
    
    // Verify the tables were created
    console.log('🔍 Verifying tables...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bag_tees', 'equipment_tees')
      ORDER BY table_name;
    `);
    
    console.log('📋 Created tables:', result.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 This script requires direct database access.');
      console.log('   Please execute the SQL manually in Supabase dashboard:');
      console.log('   1. Go to your Supabase project dashboard');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Copy and paste the content from sql/create-tees-tables.sql');
      console.log('   4. Execute the SQL');
    }
  } finally {
    await client.end();
  }
}

executeSQL();