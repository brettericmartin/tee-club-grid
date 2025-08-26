import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixWaitlistTable() {
  console.log('🔧 FIXING WAITLIST_APPLICATIONS TABLE\n');
  console.log('=' .repeat(80));
  
  // First, check current structure
  console.log('\n📊 Checking current table structure...\n');
  
  const { data: sample } = await supabase
    .from('waitlist_applications')
    .select('*')
    .limit(1);
  
  if (sample && sample.length > 0) {
    console.log('Current columns:', Object.keys(sample[0]).join(', '));
  } else {
    console.log('Table exists but is empty - checking schema...');
  }
  
  console.log('\n📝 SQL to add missing columns:\n');
  console.log('=' .repeat(80));
  
  const sql = `
-- Add missing columns to waitlist_applications table
ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS city_region TEXT;

ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS answers JSONB;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_status 
ON waitlist_applications(status);

CREATE INDEX IF NOT EXISTS idx_waitlist_score 
ON waitlist_applications(score DESC);

CREATE INDEX IF NOT EXISTS idx_waitlist_created 
ON waitlist_applications(created_at DESC);
`;
  
  console.log(sql);
  console.log('=' .repeat(80));
  
  console.log('\n⚠️  Please run the above SQL in your Supabase Dashboard SQL Editor');
  
  // Try to verify if we can see the table structure
  console.log('\n🔍 Attempting to verify table after fixes...\n');
  
  // Create a test entry to verify structure
  const testData = {
    email: 'structure-test@example.com',
    display_name: 'Structure Test',
    city_region: 'Test City',
    answers: { test: true },
    score: 50,
    status: 'pending'
  };
  
  const { data, error } = await supabase
    .from('waitlist_applications')
    .upsert(testData, { onConflict: 'email' })
    .select()
    .single();
  
  if (error) {
    console.log(`❌ Cannot insert test data: ${error.message}`);
    console.log('\nThis likely means the columns are missing. Please run the SQL above.');
  } else {
    console.log('✅ Test data inserted successfully!');
    console.log('Available columns:', Object.keys(data).join(', '));
    
    // Clean up test data
    await supabase
      .from('waitlist_applications')
      .delete()
      .eq('email', 'structure-test@example.com');
  }
}

fixWaitlistTable()
  .then(() => {
    console.log('\n✨ Waitlist table fix script complete!');
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
  });