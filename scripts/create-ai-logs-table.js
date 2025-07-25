import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAILogsTable() {
  try {
    console.log('Creating AI analysis logs table...');

    // Create the table using raw SQL
    const { error } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ai_analysis_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          analysis_type VARCHAR(50) NOT NULL,
          clubs_detected INTEGER DEFAULT 0,
          confidence_score DECIMAL(3,2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
        );

        -- Create index for user queries
        CREATE INDEX IF NOT EXISTS idx_ai_analysis_logs_user_id ON ai_analysis_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_ai_analysis_logs_created_at ON ai_analysis_logs(created_at DESC);

        -- Enable RLS
        ALTER TABLE ai_analysis_logs ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Users can view their own analysis logs" ON ai_analysis_logs
          FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own analysis logs" ON ai_analysis_logs
          FOR INSERT WITH CHECK (auth.uid() = user_id);
      `
    });

    if (error) {
      // If execute_sql doesn't exist, try direct query
      console.log('execute_sql RPC not available, trying direct query...');
      
      // Note: This is a simplified version - in production, you'd run this
      // directly in Supabase dashboard or use migrations
      console.log(`
        Please run the following SQL in your Supabase dashboard:

        CREATE TABLE IF NOT EXISTS ai_analysis_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          analysis_type VARCHAR(50) NOT NULL,
          clubs_detected INTEGER DEFAULT 0,
          confidence_score DECIMAL(3,2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
        );

        CREATE INDEX IF NOT EXISTS idx_ai_analysis_logs_user_id ON ai_analysis_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_ai_analysis_logs_created_at ON ai_analysis_logs(created_at DESC);

        ALTER TABLE ai_analysis_logs ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view their own analysis logs" ON ai_analysis_logs
          FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own analysis logs" ON ai_analysis_logs
          FOR INSERT WITH CHECK (auth.uid() = user_id);
      `);
    } else {
      console.log('✅ AI analysis logs table created successfully');
    }

  } catch (error) {
    console.error('Error creating table:', error);
  }
}

createAILogsTable();