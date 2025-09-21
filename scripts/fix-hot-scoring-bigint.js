#!/usr/bin/env node

import { supabase } from './supabase-admin.js';

console.log('🔧 Fixing hot scoring function signatures...');

const fixSQL = `
-- Drop the existing function first
DROP FUNCTION IF EXISTS calculate_hot_score(INTEGER, INTEGER, INTEGER, TIMESTAMP WITH TIME ZONE, DECIMAL);

-- Recreate with BIGINT parameters to match COUNT(*) return type
CREATE OR REPLACE FUNCTION calculate_hot_score(
  tees_1h BIGINT,
  tees_1d BIGINT,
  tees_1w BIGINT,
  created_time TIMESTAMP WITH TIME ZONE,
  boost DECIMAL DEFAULT 1.0
) RETURNS DECIMAL AS $$
DECLARE
  hours_old DECIMAL;
  tee_velocity DECIMAL;
  time_penalty DECIMAL;
  base_score DECIMAL;
BEGIN
  -- Calculate hours since creation
  hours_old := EXTRACT(EPOCH FROM (NOW() - created_time)) / 3600.0;
  
  -- Calculate weighted tee velocity (recent tees weighted more heavily)
  tee_velocity := (COALESCE(tees_1h, 0) * 3.0) + 
                  (COALESCE(tees_1d, 0) * 1.5) + 
                  (COALESCE(tees_1w, 0) * 0.5);
  
  -- Time decay penalty (similar to Reddit's algorithm)
  time_penalty := POWER(hours_old + 2, 1.5);
  
  -- Calculate base score with logarithmic scaling
  IF tee_velocity > 0 THEN
    base_score := LOG(tee_velocity + 1) * 10000;
  ELSE
    base_score := 0;
  END IF;
  
  -- Apply time penalty and boost
  RETURN (base_score / time_penalty) * COALESCE(boost, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Test the function with BIGINT values
SELECT calculate_hot_score(5::BIGINT, 10::BIGINT, 20::BIGINT, NOW() - INTERVAL '2 hours', 1.0) as test_score;
`;

try {
  const { error } = await supabase.rpc('execute_sql', { 
    query: fixSQL 
  });

  if (error) {
    console.error('❌ SQL Error:', error);
    process.exit(1);
  }

  console.log('✅ Successfully fixed calculate_hot_score function signature!');
  console.log('   - Changed parameters from INTEGER to BIGINT');
  console.log('   - Function now accepts COUNT(*) results correctly');
  console.log('');
  console.log('🔄 You can now run the hot scoring migration:');
  console.log('   node scripts/run-migration.js 20250110_add_hot_scoring.sql');

} catch (err) {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
}