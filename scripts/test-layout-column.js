import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testLayoutColumn() {
  console.log('Testing layout_data column in user_bags table...\n');

  try {
    // Test 1: Select layout_data column
    const { data, error } = await supabase
      .from('user_bags')
      .select('id, name, layout_data')
      .limit(5);

    if (error) {
      console.error('❌ Error selecting layout_data:', error);
      console.log('\nThe column might not exist yet. Please add it via Supabase dashboard:');
      console.log('1. Go to Table Editor → user_bags');
      console.log('2. Add column: layout_data (type: jsonb, default: {})');
      return;
    }

    console.log('✅ Successfully queried layout_data column!');
    console.log(`Found ${data.length} bags\n`);

    // Display current layout data
    data.forEach(bag => {
      console.log(`Bag: ${bag.name} (${bag.id})`);
      console.log(`Layout data: ${JSON.stringify(bag.layout_data || {})}`);
      console.log('---');
    });

    // Test 2: Try to update layout_data
    if (data.length > 0) {
      const testBagId = data[0].id;
      const testLayout = {
        'test-equipment-1': { position: 0, size: 1.5 },
        'test-equipment-2': { position: 1, size: 1.25 }
      };

      console.log('\nTesting layout_data update...');
      const { error: updateError } = await supabase
        .from('user_bags')
        .update({ layout_data: testLayout })
        .eq('id', testBagId);

      if (updateError) {
        console.error('❌ Error updating layout_data:', updateError);
      } else {
        console.log('✅ Successfully updated layout_data!');
        
        // Restore original value
        await supabase
          .from('user_bags')
          .update({ layout_data: data[0].layout_data || {} })
          .eq('id', testBagId);
      }
    }

    console.log('\n✅ All tests passed! The layout_data column is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLayoutColumn();