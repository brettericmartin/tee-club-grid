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

async function checkEquipmentReporting() {
  console.log('🔍 Checking equipment reporting system...\n');

  try {
    // Check if equipment_reports table exists
    const { data: reportsTable, error: reportsError } = await supabase
      .from('equipment_reports')
      .select('id')
      .limit(1);

    if (reportsError && reportsError.code === '42P01') {
      console.log('❌ equipment_reports table does not exist');
      console.log('   Please run the SQL script in sql/add-equipment-reporting.sql');
      return;
    }

    console.log('✅ equipment_reports table exists');

    // Check if columns were added to equipment table
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, report_count, duplicate_report_count, is_hidden')
      .limit(1);

    if (equipmentError) {
      console.log('❌ Could not check equipment table columns:', equipmentError.message);
    } else {
      console.log('✅ Report tracking columns added to equipment table');
    }

    // Check if the view exists
    const { data: statsView, error: statsError } = await supabase
      .from('equipment_report_stats')
      .select('*')
      .limit(1);

    if (statsError && statsError.code === '42P01') {
      console.log('❌ equipment_report_stats view does not exist');
    } else {
      console.log('✅ equipment_report_stats view exists');
    }

    // Get report counts
    const { count: reportCount } = await supabase
      .from('equipment_reports')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Current stats:`);
    console.log(`   Total reports: ${reportCount || 0}`);

    // Get hidden equipment count
    const { count: hiddenCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('is_hidden', true);

    console.log(`   Hidden equipment: ${hiddenCount || 0}`);

    console.log('\n✨ Equipment reporting system is ready!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkEquipmentReporting().catch(console.error);