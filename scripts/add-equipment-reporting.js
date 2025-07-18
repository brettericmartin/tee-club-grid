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

async function addEquipmentReporting() {
  console.log('🏗️  Adding equipment reporting system...\n');

  try {
    // Create equipment_reports table
    console.log('Creating equipment_reports table...');
    const { error: reportsTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS equipment_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
          reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
          reason_code TEXT NOT NULL CHECK (reason_code IN ('duplicate', 'incorrect_info', 'spam', 'other')),
          details TEXT,
          duplicate_of_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Prevent duplicate reports from same user
          UNIQUE(equipment_id, reported_by)
        );

        -- Add indexes for performance
        CREATE INDEX IF NOT EXISTS idx_equipment_reports_equipment ON equipment_reports(equipment_id);
        CREATE INDEX IF NOT EXISTS idx_equipment_reports_reason ON equipment_reports(reason_code);
        CREATE INDEX IF NOT EXISTS idx_equipment_reports_created ON equipment_reports(created_at);
      `
    });

    if (reportsTableError) {
      console.error('Error creating equipment_reports table:', reportsTableError);
      return;
    }
    console.log('✅ Created equipment_reports table');

    // Add reporting columns to equipment table
    console.log('\nAdding report tracking columns to equipment table...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          -- Add report_count column if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'equipment' 
                        AND column_name = 'report_count') THEN
            ALTER TABLE equipment 
            ADD COLUMN report_count INTEGER DEFAULT 0;
          END IF;
          
          -- Add duplicate_report_count column if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'equipment' 
                        AND column_name = 'duplicate_report_count') THEN
            ALTER TABLE equipment 
            ADD COLUMN duplicate_report_count INTEGER DEFAULT 0;
          END IF;
          
          -- Add is_hidden column if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'equipment' 
                        AND column_name = 'is_hidden') THEN
            ALTER TABLE equipment 
            ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
          END IF;
        END $$;
      `
    });

    if (alterError) {
      console.error('Error adding columns to equipment:', alterError);
      return;
    }
    console.log('✅ Added report tracking columns to equipment table');

    // Create report statistics view
    console.log('\nCreating equipment report statistics view...');
    const { error: viewError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE VIEW equipment_report_stats AS
        SELECT 
          equipment_id,
          COUNT(*) as total_reports,
          COUNT(*) FILTER (WHERE reason_code = 'duplicate') as duplicate_reports,
          COUNT(*) FILTER (WHERE reason_code = 'incorrect_info') as incorrect_info_reports,
          COUNT(*) FILTER (WHERE reason_code = 'spam') as spam_reports,
          COUNT(*) FILTER (WHERE reason_code = 'other') as other_reports,
          COUNT(DISTINCT reported_by) as unique_reporters,
          MAX(created_at) as last_report_date,
          ARRAY_AGG(DISTINCT duplicate_of_id) FILTER (WHERE duplicate_of_id IS NOT NULL) as duplicate_targets
        FROM equipment_reports
        GROUP BY equipment_id;
      `
    });

    if (viewError) {
      console.error('Error creating report stats view:', viewError);
      return;
    }
    console.log('✅ Created equipment_report_stats view');

    // Create function to update report counts
    console.log('\nCreating function to update report counts...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_equipment_report_counts()
        RETURNS TRIGGER AS $$
        BEGIN
          IF TG_OP = 'INSERT' THEN
            UPDATE equipment
            SET 
              report_count = report_count + 1,
              duplicate_report_count = CASE 
                WHEN NEW.reason_code = 'duplicate' 
                THEN duplicate_report_count + 1 
                ELSE duplicate_report_count 
              END
            WHERE id = NEW.equipment_id;
            
            -- Auto-hide if too many reports
            UPDATE equipment
            SET is_hidden = TRUE
            WHERE id = NEW.equipment_id
            AND (
              report_count >= 10 
              OR duplicate_report_count >= 5
              OR EXISTS (
                SELECT 1 
                FROM equipment_report_stats 
                WHERE equipment_id = NEW.equipment_id 
                AND unique_reporters >= 5
              )
            );
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (functionError) {
      console.error('Error creating update function:', functionError);
      return;
    }
    console.log('✅ Created update_equipment_report_counts function');

    // Create trigger
    console.log('\nCreating trigger for automatic count updates...');
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS update_report_counts_trigger ON equipment_reports;
        
        CREATE TRIGGER update_report_counts_trigger
        AFTER INSERT ON equipment_reports
        FOR EACH ROW
        EXECUTE FUNCTION update_equipment_report_counts();
      `
    });

    if (triggerError) {
      console.error('Error creating trigger:', triggerError);
      return;
    }
    console.log('✅ Created update_report_counts_trigger');

    // Enable RLS
    console.log('\nSetting up Row Level Security...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE equipment_reports ENABLE ROW LEVEL SECURITY;
        
        -- Anyone can view reports (for transparency)
        CREATE POLICY "Public can view equipment reports" ON equipment_reports
          FOR SELECT USING (true);
        
        -- Authenticated users can create reports
        CREATE POLICY "Authenticated users can report equipment" ON equipment_reports
          FOR INSERT WITH CHECK (auth.uid() = reported_by);
        
        -- Users can update their own reports
        CREATE POLICY "Users can update own reports" ON equipment_reports
          FOR UPDATE USING (auth.uid() = reported_by);
        
        -- Modify equipment view policy to hide reported items
        DROP POLICY IF EXISTS "Public can view equipment" ON equipment;
        CREATE POLICY "Public can view non-hidden equipment" ON equipment
          FOR SELECT USING (is_hidden = FALSE OR auth.role() = 'service_role');
      `
    });

    if (rlsError) {
      console.error('Error setting up RLS:', rlsError);
      return;
    }
    console.log('✅ Set up Row Level Security policies');

    console.log('\n🎉 Equipment reporting system added successfully!');
    console.log('\nFeatures enabled:');
    console.log('- Report equipment with reason codes');
    console.log('- Automatic hiding based on report thresholds');
    console.log('- Duplicate tracking and linking');
    console.log('- Report statistics view');
    console.log('- RLS policies for secure reporting');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addEquipmentReporting().catch(console.error);