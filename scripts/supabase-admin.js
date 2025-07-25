import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function listAllTables() {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name, table_type')
      .in('table_schema', ['public', 'auth', 'storage'])
      .order('table_schema', { ascending: true })
      .order('table_name', { ascending: true });

    if (error) {
      // If information_schema doesn't work, try a direct query
      const { data: tables, error: queryError } = await supabase.rpc('get_tables', {});
      
      if (queryError) {
        // Fallback: use a raw SQL query
        const { data: rawTables, error: rawError } = await supabase.rpc('execute_sql', {
          query: `
            SELECT 
              schemaname as table_schema,
              tablename as table_name,
              'BASE TABLE' as table_type
            FROM pg_tables
            WHERE schemaname IN ('public', 'auth', 'storage')
            ORDER BY schemaname, tablename;
          `
        });

        if (rawError) {
          console.error('Error fetching tables:', rawError);
          
          // Last resort: try to query known tables
          console.log('\nAttempting to list known tables from the project...\n');
          await listKnownTables();
          return;
        }

        console.log('\nDatabase Tables:\n');
        console.log('Schema      | Table Name                    | Type');
        console.log('------------|-------------------------------|------------');
        rawTables.forEach(table => {
          console.log(`${table.table_schema.padEnd(11)} | ${table.table_name.padEnd(29)} | ${table.table_type}`);
        });
        return;
      }

      console.log('\nDatabase Tables:\n');
      console.log('Schema      | Table Name                    | Type');
      console.log('------------|-------------------------------|------------');
      tables.forEach(table => {
        console.log(`${table.table_schema.padEnd(11)} | ${table.table_name.padEnd(29)} | ${table.table_type}`);
      });
      return;
    }

    console.log('\nDatabase Tables:\n');
    console.log('Schema      | Table Name                    | Type');
    console.log('------------|-------------------------------|------------');
    data.forEach(table => {
      console.log(`${table.table_schema.padEnd(11)} | ${table.table_name.padEnd(29)} | ${table.table_type}`);
    });

  } catch (err) {
    console.error('Error:', err);
    console.log('\nAttempting to list known tables from the project...\n');
    await listKnownTables();
  }
}

async function listKnownTables() {
  // Based on SQL files in the project, these are the known tables
  const knownTables = [
    'bags',
    'bag_equipment',
    'bag_likes',
    'equipment',
    'equipment_photo_likes',
    'feed_posts',
    'likes',
    'profiles',
    'user_follows'
  ];

  console.log('Known tables from project SQL files:\n');
  console.log('Table Name');
  console.log('----------------------------');
  
  for (const table of knownTables) {
    console.log(table);
    
    // Try to get row count
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error && count !== null) {
        console.log(`    Rows: ${count}`);
      }
    } catch (e) {
      // Ignore count errors
    }
  }
}

// Export for use in other scripts
export { supabase };

// Only run if called directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  listAllTables();
}