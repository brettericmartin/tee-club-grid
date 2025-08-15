import { supabase } from './supabase-admin.js';

async function createPriceVerificationsTable() {
  console.log('🚀 Creating price_verifications table...');

  try {
    // Create the table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql_query: `
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
      `
    });

    if (createError) {
      console.error('❌ Error creating table:', createError);
    } else {
      console.log('✅ Table created successfully');
    }

    // Add indexes
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE INDEX IF NOT EXISTS idx_price_verifications_equipment_id ON price_verifications(equipment_id);
        CREATE INDEX IF NOT EXISTS idx_price_verifications_user_id ON price_verifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_price_verifications_verified_at ON price_verifications(verified_at);
      `
    });

    if (indexError) {
      console.error('❌ Error creating indexes:', indexError);
    } else {
      console.log('✅ Indexes created successfully');
    }

    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql_query: `ALTER TABLE price_verifications ENABLE ROW LEVEL SECURITY;`
    });

    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError);
    } else {
      console.log('✅ RLS enabled successfully');
    }

    // Create RLS policies
    const policies = [
      {
        name: 'view_policy',
        sql: `CREATE POLICY "Users can view price verifications" 
              ON price_verifications FOR SELECT 
              USING (TRUE);`
      },
      {
        name: 'insert_policy',
        sql: `CREATE POLICY "Users can insert own price verifications" 
              ON price_verifications FOR INSERT 
              WITH CHECK (auth.uid() = user_id);`
      },
      {
        name: 'update_policy',
        sql: `CREATE POLICY "Users can update own price verifications" 
              ON price_verifications FOR UPDATE 
              USING (auth.uid() = user_id)
              WITH CHECK (auth.uid() = user_id);`
      },
      {
        name: 'delete_policy',
        sql: `CREATE POLICY "Users can delete own price verifications" 
              ON price_verifications FOR DELETE 
              USING (auth.uid() = user_id);`
      }
    ];

    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('exec_sql', {
        sql_query: policy.sql
      });

      if (policyError) {
        console.error(`❌ Error creating ${policy.name}:`, policyError);
      } else {
        console.log(`✅ ${policy.name} created successfully`);
      }
    }

    // Create trigger function
    const { error: triggerFunctionError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION update_price_verifications_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (triggerFunctionError) {
      console.error('❌ Error creating trigger function:', triggerFunctionError);
    } else {
      console.log('✅ Trigger function created successfully');
    }

    // Create trigger
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TRIGGER update_price_verifications_updated_at
            BEFORE UPDATE ON price_verifications
            FOR EACH ROW
            EXECUTE FUNCTION update_price_verifications_updated_at();
      `
    });

    if (triggerError) {
      console.error('❌ Error creating trigger:', triggerError);
    } else {
      console.log('✅ Trigger created successfully');
    }

    // Verify table structure
    const { data: tableInfo, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'price_verifications')
      .order('ordinal_position');

    if (verifyError) {
      console.error('❌ Error verifying table:', verifyError);
    } else if (tableInfo && tableInfo.length > 0) {
      console.log('📊 price_verifications table structure:');
      tableInfo.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
      });
    }

    console.log('🎉 Price verifications table setup complete!');

  } catch (error) {
    console.error('❌ Failed to create price verifications table:', error);
  }
}

createPriceVerificationsTable();