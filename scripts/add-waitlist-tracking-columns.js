import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addWaitlistTrackingColumns() {
  console.log('📊 Adding tracking columns to waitlist_applications...\n');
  
  try {
    // First check what columns exist
    const { data: sample } = await supabaseAdmin
      .from('waitlist_applications')
      .select('*')
      .limit(1);
    
    if (sample && sample.length > 0) {
      const existingColumns = Object.keys(sample[0]);
      console.log('Existing columns:', existingColumns.join(', '));
      
      const needsInviteCode = !existingColumns.includes('invite_code');
      const needsReferralCode = !existingColumns.includes('referral_code');
      const needsReferredBy = !existingColumns.includes('referred_by_id');
      
      if (!needsInviteCode && !needsReferralCode && !needsReferredBy) {
        console.log('✅ All tracking columns already exist!');
        return;
      }
      
      console.log('\nMissing columns:');
      if (needsInviteCode) console.log('  - invite_code');
      if (needsReferralCode) console.log('  - referral_code');
      if (needsReferredBy) console.log('  - referred_by_id');
    }
    
    // Generate SQL for missing columns
    const alterStatements = [];
    
    alterStatements.push(`
-- Add tracking columns to waitlist_applications
ALTER TABLE waitlist_applications 
ADD COLUMN IF NOT EXISTS invite_code TEXT,
ADD COLUMN IF NOT EXISTS referral_code TEXT,
ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES profiles(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_invite_code ON waitlist_applications(invite_code);
CREATE INDEX IF NOT EXISTS idx_waitlist_referral_code ON waitlist_applications(referral_code);
CREATE INDEX IF NOT EXISTS idx_waitlist_referred_by ON waitlist_applications(referred_by_id);
    `);
    
    console.log('\n⚠️  Please run this SQL in your Supabase dashboard:\n');
    console.log('=' .repeat(80));
    console.log(alterStatements.join('\n'));
    console.log('=' .repeat(80));
    
    console.log('\n📝 Instructions:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Paste and run the SQL above');
    console.log('5. The columns will be added immediately');
    
    // Test if we can insert with these columns (will fail if they don't exist)
    console.log('\n🧪 Testing column availability...');
    
    const testData = {
      email: 'column-test-' + Date.now() + '@test.com',
      display_name: 'Column Test',
      city_region: 'Test City',
      score: 50,
      status: 'pending',
      invite_code: 'TEST123',
      referral_code: 'REF456'
    };
    
    const { error } = await supabaseAdmin
      .from('waitlist_applications')
      .insert(testData);
    
    if (error) {
      if (error.message.includes('invite_code') || error.message.includes('referral_code')) {
        console.log('❌ Columns not yet added. Please run the SQL above.');
      } else {
        console.log('⚠️  Unexpected error:', error.message);
      }
    } else {
      console.log('✅ Columns are available and working!');
      
      // Clean up test record
      await supabaseAdmin
        .from('waitlist_applications')
        .delete()
        .eq('email', testData.email);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addWaitlistTrackingColumns()
  .then(() => {
    console.log('\n✨ Script complete!');
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
  });