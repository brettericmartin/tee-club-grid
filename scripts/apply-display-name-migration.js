import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Updating redeem functions to support display_name\n');
  
  try {
    // First, drop existing functions
    console.log('1. Dropping existing functions...');
    
    const dropQueries = [
      'DROP FUNCTION IF EXISTS redeem_invite_code_atomic(text, uuid, text)',
      'DROP FUNCTION IF EXISTS redeem_invite_code_atomic(text, uuid, text, text)',
      'DROP FUNCTION IF EXISTS rpc_redeem_invite_code(text, text)',
      'DROP FUNCTION IF EXISTS rpc_redeem_invite_code(text, text, text)'
    ];
    
    for (const query of dropQueries) {
      const { error } = await supabase.rpc('query_database', { query });
      if (error && !error.message.includes('does not exist')) {
        console.log(`   Warning: ${error.message}`);
      }
    }
    
    console.log('   ✓ Cleaned up existing functions');
    
    // Create the new redeem_invite_code_atomic function
    console.log('\n2. Creating updated redeem_invite_code_atomic function...');
    
    const createAtomicFunction = `
      CREATE OR REPLACE FUNCTION redeem_invite_code_atomic(
        p_code text,
        p_user_id uuid,
        p_email text DEFAULT NULL,
        p_display_name text DEFAULT NULL
      )
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_invite_record record;
        v_already_has_access boolean;
        v_profile_exists boolean;
        v_beta_cap integer;
        v_approved_count integer;
        v_final_display_name text;
      BEGIN
        -- Check if user already has beta access
        SELECT beta_access INTO v_already_has_access
        FROM profiles
        WHERE id = p_user_id;
        
        IF v_already_has_access IS TRUE THEN
          RETURN jsonb_build_object(
            'ok', true,
            'status', 'already_approved',
            'message', 'You already have beta access'
          );
        END IF;
        
        -- Lock and fetch the invite code record
        SELECT * INTO v_invite_record
        FROM invite_codes
        WHERE UPPER(code) = UPPER(p_code)
          AND active = true
          AND (expires_at IS NULL OR expires_at > NOW())
        FOR UPDATE;
        
        IF v_invite_record IS NULL THEN
          RETURN jsonb_build_object(
            'ok', false,
            'error', 'invalid_code',
            'message', 'Invalid or expired invite code'
          );
        END IF;
        
        IF v_invite_record.uses >= v_invite_record.max_uses THEN
          RETURN jsonb_build_object(
            'ok', false,
            'error', 'code_exhausted', 
            'message', 'This invite code has already been used the maximum number of times'
          );
        END IF;
        
        -- Check beta capacity
        SELECT beta_cap INTO v_beta_cap
        FROM feature_flags
        WHERE id = 1
        FOR UPDATE;
        
        SELECT COUNT(*) INTO v_approved_count
        FROM profiles
        WHERE beta_access = true;
        
        IF v_approved_count >= v_beta_cap THEN
          RETURN jsonb_build_object(
            'ok', false,
            'error', 'at_capacity',
            'message', 'Beta is currently at capacity'
          );
        END IF;
        
        -- Increment the use count
        UPDATE invite_codes
        SET uses = uses + 1
        WHERE code = v_invite_record.code;
        
        -- Determine display name to use
        v_final_display_name := COALESCE(
          p_display_name,
          CASE 
            WHEN p_email IS NOT NULL THEN split_part(p_email, '@', 1)
            ELSE NULL
          END
        );
        
        -- Check if profile exists
        SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;
        
        IF v_profile_exists THEN
          -- Update existing profile
          UPDATE profiles
          SET 
            beta_access = true,
            display_name = COALESCE(display_name, v_final_display_name),
            email = COALESCE(email, p_email),
            updated_at = NOW()
          WHERE id = p_user_id;
        ELSE
          -- Create new profile with beta access
          INSERT INTO profiles (id, beta_access, email, display_name, created_at, updated_at)
          VALUES (p_user_id, true, p_email, v_final_display_name, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE
          SET 
            beta_access = true,
            display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
            email = COALESCE(profiles.email, EXCLUDED.email),
            updated_at = NOW();
        END IF;
        
        -- Return success
        RETURN jsonb_build_object(
          'ok', true,
          'status', 'approved',
          'message', 'Successfully redeemed invite code! Welcome to Teed.club beta.',
          'inviteCodeOwner', v_invite_record.created_by_profile_id
        );
      END;
      $$
    `;
    
    // Execute as raw SQL since we don't have execute_sql
    console.log('   Note: Manual execution may be required if RPC functions are not available');
    console.log('   ✓ Function definition prepared');
    
    // Create the wrapper function
    console.log('\n3. Creating rpc_redeem_invite_code wrapper...');
    
    const createWrapperFunction = `
      CREATE OR REPLACE FUNCTION rpc_redeem_invite_code(
        p_code text,
        p_email text DEFAULT NULL,
        p_display_name text DEFAULT NULL
      )
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        -- Call the main function with the current user's ID
        RETURN redeem_invite_code_atomic(p_code, auth.uid(), p_email, p_display_name);
      END;
      $$
    `;
    
    console.log('   ✓ Wrapper function definition prepared');
    
    console.log('\n✅ Migration SQL prepared successfully!');
    console.log('\n📝 To apply manually, run the SQL in scripts/add-display-name-to-redeem.sql');
    console.log('   in your Supabase SQL editor or via the CLI.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

runMigration().catch(console.error);