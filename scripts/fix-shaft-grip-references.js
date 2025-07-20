import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixShaftGripReferences() {
  console.log('🔧 Fixing shaft/grip references...\n');

  try {
    // First, check if there are any shaft/grip equipment items
    const { data: shafts, error: shaftError } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .eq('category', 'shaft');

    const { data: grips, error: gripError } = await supabase
      .from('equipment')
      .select('id, brand, model')
      .eq('category', 'grip');

    console.log(`Found ${shafts?.length || 0} shafts in equipment table`);
    console.log(`Found ${grips?.length || 0} grips in equipment table\n`);

    // Get bag_equipment items with shaft/grip references
    const { data: bagItems, error: bagError } = await supabase
      .from('bag_equipment')
      .select('id, shaft_id, grip_id')
      .or('shaft_id.not.is.null,grip_id.not.is.null');

    console.log(`Found ${bagItems?.length || 0} bag items with shaft/grip references\n`);

    // Check if any of these references are valid
    let validShaftRefs = 0;
    let validGripRefs = 0;
    let invalidShaftRefs = 0;
    let invalidGripRefs = 0;

    const shaftIds = new Set(shafts?.map(s => s.id) || []);
    const gripIds = new Set(grips?.map(g => g.id) || []);

    for (const item of bagItems || []) {
      if (item.shaft_id) {
        if (shaftIds.has(item.shaft_id)) {
          validShaftRefs++;
        } else {
          invalidShaftRefs++;
        }
      }
      if (item.grip_id) {
        if (gripIds.has(item.grip_id)) {
          validGripRefs++;
        } else {
          invalidGripRefs++;
        }
      }
    }

    console.log('Reference Status:');
    console.log(`✅ Valid shaft references: ${validShaftRefs}`);
    console.log(`❌ Invalid shaft references: ${invalidShaftRefs}`);
    console.log(`✅ Valid grip references: ${validGripRefs}`);
    console.log(`❌ Invalid grip references: ${invalidGripRefs}`);

    if (invalidShaftRefs > 0 || invalidGripRefs > 0) {
      console.log('\n⚠️  Found invalid references. These likely point to old shaft/grip table IDs.');
      console.log('The migration may not have updated the bag_equipment references properly.');
      
      // Clear invalid references
      console.log('\n🧹 Clearing invalid references...');
      
      let clearedCount = 0;
      for (const item of bagItems || []) {
        let needsUpdate = false;
        const updates = {};
        
        if (item.shaft_id && !shaftIds.has(item.shaft_id)) {
          updates.shaft_id = null;
          needsUpdate = true;
        }
        
        if (item.grip_id && !gripIds.has(item.grip_id)) {
          updates.grip_id = null;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          const { error } = await supabase
            .from('bag_equipment')
            .update(updates)
            .eq('id', item.id);
          
          if (!error) clearedCount++;
        }
      }
      
      console.log(`✅ Cleared ${clearedCount} invalid references`);
    } else {
      console.log('\n✅ All references are valid!');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

fixShaftGripReferences();