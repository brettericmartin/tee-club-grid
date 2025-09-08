import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addColorCustomizationFields() {
  console.log('Adding color customization fields to profiles table...');
  
  try {
    // Add color customization fields to profiles table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add color customization fields to profiles table
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#10B981',
        ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7) DEFAULT '#FFD700',
        ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(10) DEFAULT 'dark',
        ADD COLUMN IF NOT EXISTS custom_gradient JSONB DEFAULT NULL;
        
        -- Add comments for documentation
        COMMENT ON COLUMN profiles.primary_color IS 'User primary theme color (hex format)';
        COMMENT ON COLUMN profiles.accent_color IS 'User accent/secondary color (hex format)';
        COMMENT ON COLUMN profiles.theme_mode IS 'Color theme mode (dark/light/auto)';
        COMMENT ON COLUMN profiles.custom_gradient IS 'Custom gradient configuration for backgrounds';
      `
    });
    
    if (alterError) {
      // If exec_sql doesn't exist, try direct approach
      console.log('Using direct SQL approach...');
      
      const { error: directError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (!directError) {
        console.log('✅ Table structure verified. Please run the following SQL manually:');
        console.log(`
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#10B981',
ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7) DEFAULT '#FFD700',
ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(10) DEFAULT 'dark',
ADD COLUMN IF NOT EXISTS custom_gradient JSONB DEFAULT NULL;
        `);
      }
    } else {
      console.log('✅ Color customization fields added successfully!');
    }
    
    // Verify the columns exist
    const { data: testProfile, error: testError } = await supabase
      .from('profiles')
      .select('id, primary_color, accent_color, theme_mode, custom_gradient')
      .limit(1);
    
    if (!testError && testProfile) {
      console.log('✅ Verified: Color customization fields are available');
      console.log('Sample profile structure:', testProfile[0] || 'No profiles found');
    } else if (testError) {
      console.log('❌ Could not verify fields:', testError.message);
      console.log('You may need to add the fields manually using the SQL above.');
    }
    
  } catch (error) {
    console.error('Error adding color customization fields:', error);
    process.exit(1);
  }
}

// Run the migration
addColorCustomizationFields();