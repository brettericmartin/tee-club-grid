import { supabase } from './supabase-admin.js';

async function fixEquipmentPhotosRLS() {
  console.log('=== FIXING EQUIPMENT_PHOTOS RLS POLICIES ===\n');
  
  try {
    // First, enable RLS on the table if not already enabled
    console.log('1. Ensuring RLS is enabled on equipment_photos table...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;'
    }).catch(() => {
      // Might already be enabled, that's ok
      console.log('   RLS might already be enabled');
    });
    
    // Create public read policy
    console.log('2. Creating public read policy for equipment_photos...');
    const createReadPolicy = `
      CREATE POLICY "Public can view all equipment photos" 
      ON equipment_photos 
      FOR SELECT 
      USING (true);
    `;
    
    const { error: readError } = await supabase.rpc('exec_sql', {
      sql: createReadPolicy
    });
    
    if (readError) {
      if (readError.message?.includes('already exists')) {
        console.log('   Read policy already exists');
      } else {
        console.error('   Error creating read policy:', readError);
      }
    } else {
      console.log('   ✅ Read policy created successfully');
    }
    
    // Create insert policy for authenticated users
    console.log('3. Creating insert policy for authenticated users...');
    const createInsertPolicy = `
      CREATE POLICY "Authenticated users can add equipment photos" 
      ON equipment_photos 
      FOR INSERT 
      WITH CHECK (auth.uid() IS NOT NULL);
    `;
    
    const { error: insertError } = await supabase.rpc('exec_sql', {
      sql: createInsertPolicy
    });
    
    if (insertError) {
      if (insertError.message?.includes('already exists')) {
        console.log('   Insert policy already exists');
      } else {
        console.error('   Error creating insert policy:', insertError);
      }
    } else {
      console.log('   ✅ Insert policy created successfully');
    }
    
    // Create update policy for photo owners
    console.log('4. Creating update policy for photo owners...');
    const createUpdatePolicy = `
      CREATE POLICY "Users can update their own equipment photos" 
      ON equipment_photos 
      FOR UPDATE 
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    `;
    
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: createUpdatePolicy
    });
    
    if (updateError) {
      if (updateError.message?.includes('already exists')) {
        console.log('   Update policy already exists');
      } else {
        console.error('   Error creating update policy:', updateError);
      }
    } else {
      console.log('   ✅ Update policy created successfully');
    }
    
    // Test the fix
    console.log('\n5. Testing if photos are now accessible...');
    const { createClient } = await import('@supabase/supabase-js');
    const anonSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const { data: testData } = await anonSupabase
      .from('equipment_photos')
      .select('id')
      .limit(1);
      
    if (testData !== null) {
      console.log('   ✅ SUCCESS! Equipment photos are now publicly readable!');
    } else {
      console.log('   ❌ Still cannot read equipment_photos - may need manual intervention');
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

fixEquipmentPhotosRLS().then(() => {
  console.log('\nDone! Refresh your browser to see the photos.');
  process.exit(0);
}).catch(console.error);