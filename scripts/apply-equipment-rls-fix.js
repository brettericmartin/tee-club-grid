import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function fixRLS() {
  // Extract connection details from Supabase URL
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  
  if (!dbUrl) {
    // Construct from Supabase URL
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
    
    console.error('DATABASE_URL not found. Please set it in your .env file.');
    console.log(`Your project ref appears to be: ${projectRef}`);
    console.log('You can find your database URL in the Supabase dashboard under Settings > Database');
    return;
  }
  
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Enable RLS
    await client.query('ALTER TABLE equipment ENABLE ROW LEVEL SECURITY');
    console.log('✅ RLS enabled on equipment table');
    
    // Drop existing policies
    const dropPolicies = [
      "DROP POLICY IF EXISTS \"Equipment is viewable by everyone\" ON equipment",
      "DROP POLICY IF EXISTS \"Users can insert equipment\" ON equipment",
      "DROP POLICY IF EXISTS \"Users can update their own equipment\" ON equipment",
      "DROP POLICY IF EXISTS \"Anyone can view equipment\" ON equipment",
      "DROP POLICY IF EXISTS \"Public read access\" ON equipment"
    ];
    
    for (const drop of dropPolicies) {
      await client.query(drop);
    }
    console.log('✅ Dropped existing policies');
    
    // Create new public read policy
    await client.query(`
      CREATE POLICY "Equipment is viewable by everyone" 
      ON equipment 
      FOR SELECT 
      USING (true)
    `);
    console.log('✅ Created public read policy');
    
    // Create insert policy
    await client.query(`
      CREATE POLICY "Users can insert equipment"
      ON equipment
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL)
    `);
    console.log('✅ Created insert policy');
    
    // Create update policy
    await client.query(`
      CREATE POLICY "Users can update their own equipment"
      ON equipment
      FOR UPDATE
      USING (
        added_by_user_id = auth.uid() 
        OR added_by_user_id IS NULL
      )
      WITH CHECK (
        added_by_user_id = auth.uid() 
        OR added_by_user_id IS NULL
      )
    `);
    console.log('✅ Created update policy');
    
    // Verify
    const result = await client.query(`
      SELECT policyname, cmd 
      FROM pg_policies 
      WHERE tablename = 'equipment'
    `);
    
    console.log('\nCurrent policies on equipment table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.policyname} (${row.cmd})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixRLS().catch(console.error);