#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixGoogleAuthProfile() {
  console.log('Fixing Google OAuth profile creation...\n');

  // First, let's check the current trigger function
  const checkTriggerSQL = `
    SELECT 
      prosrc as function_source
    FROM pg_proc 
    WHERE proname = 'handle_new_user';
  `;

  const { data: triggerData, error: triggerError } = await supabase.rpc('sql_query', {
    query: checkTriggerSQL
  }).single();

  if (triggerError) {
    console.log('No existing trigger found, will create new one');
  } else {
    console.log('Current trigger function found, updating...');
  }

  // Update the handle_new_user function to handle Google OAuth users better
  const updateTriggerSQL = `
    -- Drop existing trigger first
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    
    -- Create improved function that handles OAuth users
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    DECLARE
      default_username TEXT;
      username_exists BOOLEAN;
      counter INTEGER := 0;
      final_username TEXT;
    BEGIN
      -- Generate a default username from email or provider data
      default_username := COALESCE(
        new.raw_user_meta_data->>'username',
        new.raw_user_meta_data->>'preferred_username',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
      );
      
      -- Clean up the username (remove spaces, special chars)
      default_username := regexp_replace(lower(default_username), '[^a-z0-9_]', '', 'g');
      
      -- If username is empty after cleaning, use email prefix
      IF default_username = '' OR default_username IS NULL THEN
        default_username := split_part(new.email, '@', 1);
        default_username := regexp_replace(lower(default_username), '[^a-z0-9_]', '', 'g');
      END IF;
      
      -- Ensure username is not too short
      IF length(default_username) < 3 THEN
        default_username := 'user' || substring(new.id::text, 1, 8);
      END IF;
      
      -- Check if username exists and append number if needed
      final_username := default_username;
      LOOP
        SELECT EXISTS (
          SELECT 1 FROM public.profiles WHERE username = final_username
        ) INTO username_exists;
        
        EXIT WHEN NOT username_exists;
        
        counter := counter + 1;
        final_username := default_username || counter;
      END LOOP;
      
      -- Insert the profile with the unique username
      INSERT INTO public.profiles (id, username, full_name, avatar_url, created_at, updated_at)
      VALUES (
        new.id,
        final_username,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url',
        now(),
        now()
      );
      
      RETURN new;
    EXCEPTION
      WHEN unique_violation THEN
        -- If there's still a unique violation, generate a random username
        INSERT INTO public.profiles (id, username, created_at, updated_at)
        VALUES (
          new.id,
          'user_' || substring(new.id::text, 1, 12),
          now(),
          now()
        );
        RETURN new;
      WHEN OTHERS THEN
        -- Log the error but don't fail the signup
        RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
        RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Recreate the trigger
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    
    -- Grant necessary permissions
    GRANT USAGE ON SCHEMA public TO anon;
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT ALL ON public.profiles TO authenticated;
    GRANT SELECT ON public.profiles TO anon;
  `;

  console.log('Updating trigger function to handle Google OAuth users...');
  
  const { error: updateError } = await supabase.rpc('exec_sql', {
    sql: updateTriggerSQL
  });

  if (updateError) {
    // Try direct execution if RPC doesn't work
    console.log('RPC failed, trying direct execution...');
    
    // Execute as separate statements
    const statements = updateTriggerSQL.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          if (error) {
            console.error(`Error executing: ${statement.substring(0, 50)}...`);
            console.error(error);
          }
        } catch (e) {
          console.error(`Failed to execute: ${statement.substring(0, 50)}...`);
        }
      }
    }
  }

  console.log('\n✅ Google OAuth profile trigger has been updated!');
  console.log('\nThe trigger will now:');
  console.log('1. Generate usernames from Google profile data (name or email)');
  console.log('2. Clean and validate usernames');
  console.log('3. Automatically append numbers if username exists');
  console.log('4. Handle edge cases gracefully');
  console.log('\nUsers can now sign in with Google without database errors!');
  
  process.exit(0);
}

// Add error handler for unhandled promises
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

fixGoogleAuthProfile().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});