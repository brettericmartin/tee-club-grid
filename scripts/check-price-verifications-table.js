import { supabase } from './supabase-admin.js';

async function checkPriceVerificationsTable() {
  console.log('🔍 Checking price_verifications table...');

  try {
    // Try to query the table to see if it exists
    const { data, error } = await supabase
      .from('price_verifications')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log('❌ Table does not exist');
        console.log('Creating the table manually...');
        await createTableManually();
      } else {
        console.error('❌ Error checking table:', error);
      }
    } else {
      console.log('✅ Table exists and is accessible');
      console.log(`📊 Current records: ${data.length}`);
    }

  } catch (error) {
    console.error('❌ Failed to check table:', error);
  }
}

async function createTableManually() {
  try {
    // Since RPC isn't available, let's try to create via SQL execution using a different method
    // Let's just create via INSERT to test if we can interact with the database
    
    console.log('⚠️  Cannot create table via SQL RPC.');
    console.log('💡 The table needs to be created manually in the Supabase dashboard.');
    console.log('\n📋 SQL to execute in Supabase dashboard:');
    console.log('---------------------------------------------');
    console.log(`
CREATE TABLE IF NOT EXISTS price_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    retailer_name VARCHAR(255) NOT NULL,
    product_url TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_price_verifications_equipment_id ON price_verifications(equipment_id);
CREATE INDEX IF NOT EXISTS idx_price_verifications_user_id ON price_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_price_verifications_verified_at ON price_verifications(verified_at);

-- Enable RLS
ALTER TABLE price_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view price verifications" 
    ON price_verifications FOR SELECT 
    USING (TRUE);

CREATE POLICY "Users can insert own price verifications" 
    ON price_verifications FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own price verifications" 
    ON price_verifications FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own price verifications" 
    ON price_verifications FOR DELETE 
    USING (auth.uid() = user_id);

-- Trigger function
CREATE OR REPLACE FUNCTION update_price_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_price_verifications_updated_at
    BEFORE UPDATE ON price_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_price_verifications_updated_at();
    `);
    console.log('---------------------------------------------\n');
    
  } catch (error) {
    console.error('❌ Error in manual creation:', error);
  }
}

checkPriceVerificationsTable();