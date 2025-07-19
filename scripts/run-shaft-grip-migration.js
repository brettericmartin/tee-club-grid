import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runShaftGripMigration() {
  console.log('🚀 Running shaft/grip equipment migration...\n');

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, '../sql/add-shaft-grip-equipment.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolons and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('DO $$'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip DO blocks as they're just for messages
      if (statement.includes('DO $$') || statement.includes('RAISE NOTICE')) {
        continue;
      }

      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      // For ALTER TABLE statements, we need to handle them differently
      if (statement.startsWith('ALTER TABLE')) {
        // Execute ALTER statements one at a time through RPC
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error && !error.message.includes('already exists')) {
          console.error(`Error in statement ${i + 1}:`, error);
        } else {
          console.log(`✓ Statement ${i + 1} executed successfully`);
        }
      } else if (statement.includes('INSERT INTO equipment')) {
        // Handle equipment inserts
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error) {
          console.error(`Error inserting equipment:`, error);
        } else {
          console.log(`✓ Equipment insert executed successfully`);
        }
      } else if (statement.includes('CREATE') && statement.includes('VIEW')) {
        // Handle view creation
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error && !error.message.includes('already exists')) {
          console.error(`Error creating view:`, error);
        } else {
          console.log(`✓ View created successfully`);
        }
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('\nNext steps:');
    console.log('1. Run the migration script: node scripts/migrate-shafts-grips-to-equipment.js');
    console.log('2. Test the setup: node scripts/test-shaft-grip-equipment.js');

  } catch (error) {
    console.error('Migration error:', error);
  }
}

// First create the RPC function if it doesn't exist
async function createExecSqlFunction() {
  const createFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1' });
    if (error) {
      // Function doesn't exist, create it
      console.log('Creating exec_sql function...');
      // This would need to be done through Supabase dashboard
      console.log('⚠️  Please create the exec_sql function in Supabase dashboard first');
      console.log('SQL:', createFunction);
      return false;
    }
    return true;
  } catch (e) {
    console.log('⚠️  exec_sql function not found. Please create it in Supabase dashboard:');
    console.log(createFunction);
    return false;
  }
}

// Run the migration
async function main() {
  // const hasExecSql = await createExecSqlFunction();
  // if (!hasExecSql) {
  //   console.log('\n⚠️  Cannot proceed without exec_sql function');
  //   return;
  // }
  
  // For now, let's run the individual operations directly
  console.log('🔧 Running shaft/grip equipment setup...\n');
  
  try {
    // 1. Check if shaft/grip categories are already allowed
    console.log('1. Checking equipment categories...');
    const { data: equipment } = await supabase
      .from('equipment')
      .select('category')
      .in('category', ['shaft', 'grip'])
      .limit(1);
    
    if (!equipment || equipment.length === 0) {
      console.log('✓ Shaft/grip categories not yet in equipment table');
    } else {
      console.log('✓ Shaft/grip categories already exist in equipment table');
    }

    // 2. Add popular shafts as equipment
    console.log('\n2. Adding shaft equipment items...');
    const shafts = [
      { brand: 'Fujikura', model: 'Ventus Blue', category: 'shaft', msrp: 350 },
      { brand: 'Fujikura', model: 'Ventus Black', category: 'shaft', msrp: 350 },
      { brand: 'Fujikura', model: 'Ventus Red', category: 'shaft', msrp: 350 },
      { brand: 'Mitsubishi', model: 'Tensei AV Blue', category: 'shaft', msrp: 200 },
      { brand: 'Mitsubishi', model: 'Diamana D+', category: 'shaft', msrp: 300 },
      { brand: 'Project X', model: 'HZRDUS Smoke', category: 'shaft', msrp: 250 },
      { brand: 'Graphite Design', model: 'Tour AD DI', category: 'shaft', msrp: 450 },
      { brand: 'Aldila', model: 'Rogue Black', category: 'shaft', msrp: 175 },
      { brand: 'KBS', model: 'Tour', category: 'shaft', msrp: 110 },
      { brand: 'True Temper', model: 'Dynamic Gold', category: 'shaft', msrp: 25 }
    ];

    for (const shaft of shafts) {
      const { error } = await supabase
        .from('equipment')
        .insert({
          ...shaft,
          created_at: new Date().toISOString()
        });
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`Error adding ${shaft.brand} ${shaft.model}:`, error);
      } else if (!error) {
        console.log(`✓ Added ${shaft.brand} ${shaft.model}`);
      }
    }

    // 3. Add popular grips as equipment
    console.log('\n3. Adding grip equipment items...');
    const grips = [
      { brand: 'Golf Pride', model: 'MCC Plus4', category: 'grip', msrp: 13 },
      { brand: 'Golf Pride', model: 'Tour Velvet', category: 'grip', msrp: 8 },
      { brand: 'Golf Pride', model: 'CP2 Pro', category: 'grip', msrp: 11 },
      { brand: 'Lamkin', model: 'Crossline', category: 'grip', msrp: 7 },
      { brand: 'Lamkin', model: 'UTx', category: 'grip', msrp: 10 },
      { brand: 'SuperStroke', model: 'S-Tech', category: 'grip', msrp: 10 },
      { brand: 'Winn', model: 'Dri-Tac', category: 'grip', msrp: 9 },
      { brand: 'IOMIC', model: 'Sticky 2.3', category: 'grip', msrp: 25 }
    ];

    for (const grip of grips) {
      const { error } = await supabase
        .from('equipment')
        .insert({
          ...grip,
          created_at: new Date().toISOString()
        });
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`Error adding ${grip.brand} ${grip.model}:`, error);
      } else if (!error) {
        console.log(`✓ Added ${grip.brand} ${grip.model}`);
      }
    }

    console.log('\n✅ Setup complete!');
    console.log('\nYou can now:');
    console.log('- Add shafts and grips as standalone equipment items');
    console.log('- Upload photos for shafts and grips');
    console.log('- Run the migration script to import existing shaft/grip data');

  } catch (error) {
    console.error('Setup error:', error);
  }
}

main().catch(console.error);