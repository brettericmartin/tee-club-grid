import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createCommunityTables() {
  console.log('🏗️  Creating community equipment tables...\n');

  // Create equipment_submissions table
  const { error: submissionsError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS equipment_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        category TEXT NOT NULL,
        year INTEGER,
        msrp DECIMAL(10, 2),
        image_url TEXT,
        specs JSONB DEFAULT '{}',
        ai_analysis JSONB DEFAULT '{}',
        community_votes JSONB DEFAULT '{"up": 0, "down": 0, "voters": {}}',
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ai_approved', 'community_review', 'approved', 'rejected', 'merged')),
        merged_into UUID REFERENCES equipment(id) ON DELETE SET NULL,
        rejection_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        reviewed_at TIMESTAMP WITH TIME ZONE
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_submissions_status ON equipment_submissions(status);
      CREATE INDEX IF NOT EXISTS idx_submissions_brand_model ON equipment_submissions(brand, model);
      CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by ON equipment_submissions(submitted_by);
      CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON equipment_submissions(created_at);
    `
  });

  if (submissionsError) {
    console.error('Error creating equipment_submissions table:', submissionsError);
    return;
  }

  console.log('✅ Created equipment_submissions table');

  // Create duplicate reports table
  const { error: duplicatesError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS equipment_duplicate_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        equipment_id_1 UUID REFERENCES equipment(id) ON DELETE CASCADE,
        equipment_id_2 UUID REFERENCES equipment(id) ON DELETE CASCADE,
        reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
        notes TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
        
        -- Ensure no duplicate reports
        UNIQUE(equipment_id_1, equipment_id_2)
      );

      CREATE INDEX IF NOT EXISTS idx_duplicate_reports_status ON equipment_duplicate_reports(status);
    `
  });

  if (duplicatesError) {
    console.error('Error creating equipment_duplicate_reports table:', duplicatesError);
    return;
  }

  console.log('✅ Created equipment_duplicate_reports table');

  // Create community contribution stats view
  const { error: viewError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE VIEW community_contribution_stats AS
      SELECT 
        p.id as user_id,
        p.username,
        COUNT(DISTINCT es.id) FILTER (WHERE es.status = 'approved') as approved_submissions,
        COUNT(DISTINCT es.id) FILTER (WHERE es.status = 'pending') as pending_submissions,
        COUNT(DISTINCT es.id) FILTER (WHERE es.status = 'rejected') as rejected_submissions,
        COUNT(DISTINCT edr.id) as duplicate_reports
      FROM profiles p
      LEFT JOIN equipment_submissions es ON es.submitted_by = p.id
      LEFT JOIN equipment_duplicate_reports edr ON edr.reported_by = p.id
      GROUP BY p.id, p.username
      HAVING COUNT(DISTINCT es.id) > 0 OR COUNT(DISTINCT edr.id) > 0;
    `
  });

  if (viewError) {
    console.error('Error creating community stats view:', viewError);
  } else {
    console.log('✅ Created community_contribution_stats view');
  }

  // Add community fields to equipment table if not exists
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: `
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'equipment' 
                      AND column_name = 'community_verified') THEN
          ALTER TABLE equipment 
          ADD COLUMN community_verified BOOLEAN DEFAULT FALSE,
          ADD COLUMN community_score INTEGER DEFAULT 0;
        END IF;
      END $$;
    `
  });

  if (alterError) {
    console.error('Error adding community fields to equipment:', alterError);
  } else {
    console.log('✅ Added community fields to equipment table');
  }

  // Create RLS policies
  console.log('\n🔒 Setting up Row Level Security policies...');

  // Enable RLS
  await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE equipment_submissions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE equipment_duplicate_reports ENABLE ROW LEVEL SECURITY;
    `
  });

  // Policies for equipment_submissions
  await supabase.rpc('exec_sql', {
    sql: `
      -- Anyone can view approved submissions
      CREATE POLICY "Public can view approved submissions" ON equipment_submissions
        FOR SELECT USING (status = 'approved');
      
      -- Authenticated users can view all submissions
      CREATE POLICY "Authenticated users can view all submissions" ON equipment_submissions
        FOR SELECT USING (auth.role() = 'authenticated');
      
      -- Authenticated users can create submissions
      CREATE POLICY "Authenticated users can create submissions" ON equipment_submissions
        FOR INSERT WITH CHECK (auth.uid() = submitted_by);
      
      -- Users can update their own pending submissions
      CREATE POLICY "Users can update own pending submissions" ON equipment_submissions
        FOR UPDATE USING (auth.uid() = submitted_by AND status = 'pending');
    `
  });

  // Policies for duplicate reports
  await supabase.rpc('exec_sql', {
    sql: `
      -- Authenticated users can view reports
      CREATE POLICY "Authenticated users can view duplicate reports" ON equipment_duplicate_reports
        FOR SELECT USING (auth.role() = 'authenticated');
      
      -- Authenticated users can create reports
      CREATE POLICY "Authenticated users can create duplicate reports" ON equipment_duplicate_reports
        FOR INSERT WITH CHECK (auth.uid() = reported_by);
    `
  });

  console.log('✅ Created RLS policies');

  console.log('\n🎉 Community equipment tables created successfully!');
  console.log('\nFeatures enabled:');
  console.log('- User equipment submissions with AI validation');
  console.log('- Community voting on submissions');
  console.log('- Duplicate reporting system');
  console.log('- Contribution tracking and stats');
  console.log('- Row Level Security for data protection');
}

createCommunityTables().catch(console.error);