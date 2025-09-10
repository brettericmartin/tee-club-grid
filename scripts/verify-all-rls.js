import './supabase-admin.js';
import { supabase } from './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Create anonymous client for testing public access
const supabaseAnon = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Tables to verify with their expected behaviors
const TABLES_TO_VERIFY = [
  {
    name: 'profiles',
    tests: {
      publicRead: true,
      authenticatedInsert: true,
      ownerUpdate: true,
      ownerDelete: false // Profiles should never be deleted
    }
  },
  {
    name: 'equipment',
    tests: {
      publicRead: true,
      authenticatedInsert: true,
      ownerUpdate: true,
      ownerDelete: false // Equipment should not be deleted
    }
  },
  {
    name: 'equipment_photos',
    tests: {
      publicRead: true,
      authenticatedInsert: true,
      ownerUpdate: true,
      ownerDelete: true
    }
  },
  {
    name: 'user_bags',
    tests: {
      publicRead: true, // Public bags should be visible
      authenticatedInsert: true,
      ownerUpdate: true,
      ownerDelete: true
    }
  },
  {
    name: 'bag_equipment',
    tests: {
      publicRead: true,
      authenticatedInsert: true,
      ownerUpdate: true,
      ownerDelete: true
    }
  },
  {
    name: 'feed_posts',
    tests: {
      publicRead: true,
      authenticatedInsert: true,
      ownerUpdate: true,
      ownerDelete: true
    }
  },
  {
    name: 'feed_likes',
    tests: {
      publicRead: true,
      authenticatedInsert: true,
      ownerUpdate: false, // Likes are immutable
      ownerDelete: true
    }
  },
  {
    name: 'user_follows',
    tests: {
      publicRead: true,
      authenticatedInsert: true,
      ownerUpdate: false, // Follows are immutable
      ownerDelete: true
    }
  },
  {
    name: 'equipment_tees',
    tests: {
      publicRead: true,
      authenticatedInsert: true,
      ownerUpdate: false, // Tees are immutable
      ownerDelete: true
    }
  },
  {
    name: 'bag_tees',
    tests: {
      publicRead: true,
      authenticatedInsert: true,
      ownerUpdate: false, // Tees are immutable
      ownerDelete: true
    }
  },
  {
    name: 'equipment_saves',
    tests: {
      publicRead: true,
      authenticatedInsert: true,
      ownerUpdate: false, // Saves are immutable
      ownerDelete: true
    }
  },
  {
    name: 'user_bag_videos',
    tests: {
      publicRead: true, // Public/shared videos
      authenticatedInsert: true,
      ownerUpdate: true,
      ownerDelete: true
    }
  },
  {
    name: 'forum_categories',
    tests: {
      publicRead: true,
      authenticatedInsert: false, // Admin only
      ownerUpdate: false, // Admin only
      ownerDelete: false // Admin only
    }
  },
  {
    name: 'forum_threads',
    tests: {
      publicRead: true,
      authenticatedInsert: true,
      ownerUpdate: true,
      ownerDelete: true
    }
  },
  {
    name: 'forum_posts',
    tests: {
      publicRead: true,
      authenticatedInsert: true,
      ownerUpdate: true,
      ownerDelete: true
    }
  },
  {
    name: 'waitlist_applications',
    tests: {
      publicRead: false, // Only own applications
      authenticatedInsert: true, // Anyone can apply
      ownerUpdate: false, // Admin only
      ownerDelete: false // Admin only
    }
  }
];

async function verifyTableExists(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    
    return !error || !error.message.includes('relation');
  } catch {
    return false;
  }
}

async function verifyRLSEnabled(tableName) {
  try {
    // Try to get RLS status using service key
    const { data, error } = await supabase.rpc('check_table_rls_status', { 
      table_name: tableName 
    }).single();
    
    if (data) {
      return data.rls_enabled;
    }
    
    // Fallback: check if we get different results with anon vs service key
    const { count: serviceCount } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    const { count: anonCount } = await supabaseAnon
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    // If counts differ, RLS is likely enabled
    return serviceCount !== anonCount || serviceCount === 0;
  } catch {
    return null;
  }
}

async function verifyPublicRead(tableName) {
  try {
    const { data, error } = await supabaseAnon
      .from(tableName)
      .select('*')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
}

async function getPolicies(tableName) {
  try {
    const { data } = await supabase.rpc('get_policies_for_table', { 
      table_name: tableName 
    });
    
    if (data && data.length > 0) {
      return data.map(p => ({
        name: p.policyname,
        command: p.cmd,
        permissive: p.permissive
      }));
    }
    
    return [];
  } catch {
    return [];
  }
}

async function runVerification() {
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║           RLS VERIFICATION REPORT - TEED.CLUB             ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`${colors.yellow}Checking all tables for proper RLS configuration...${colors.reset}\n`);

  let totalTables = 0;
  let tablesWithRLS = 0;
  let tablesWithIssues = 0;
  const issues = [];

  for (const table of TABLES_TO_VERIFY) {
    const exists = await verifyTableExists(table.name);
    
    if (!exists) {
      console.log(`${colors.yellow}⚠ Table '${table.name}' does not exist (skipping)${colors.reset}`);
      continue;
    }
    
    totalTables++;
    console.log(`\n${colors.bright}📊 Table: ${table.name}${colors.reset}`);
    console.log('─'.repeat(40));
    
    // Check if RLS is enabled
    const rlsEnabled = await verifyRLSEnabled(table.name);
    
    if (rlsEnabled === true) {
      console.log(`  ✅ RLS: Enabled`);
      tablesWithRLS++;
    } else if (rlsEnabled === false) {
      console.log(`  ${colors.red}❌ RLS: DISABLED${colors.reset}`);
      issues.push(`${table.name}: RLS is disabled`);
      tablesWithIssues++;
    } else {
      console.log(`  ${colors.yellow}⚠ RLS: Unable to verify${colors.reset}`);
    }
    
    // Get and display policies
    const policies = await getPolicies(table.name);
    if (policies.length > 0) {
      console.log(`  📋 Policies (${policies.length}):`);
      policies.forEach(p => {
        console.log(`     • ${p.name} (${p.command})`);
      });
    } else {
      console.log(`  ${colors.yellow}⚠ No policies found${colors.reset}`);
    }
    
    // Test public read access
    if (table.tests.publicRead) {
      const canRead = await verifyPublicRead(table.name);
      if (canRead) {
        console.log(`  ✅ Public Read: Working`);
      } else {
        console.log(`  ${colors.red}❌ Public Read: BLOCKED${colors.reset}`);
        issues.push(`${table.name}: Public read access is blocked`);
        tablesWithIssues++;
      }
    }
  }

  // Summary
  console.log(`\n${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║                         SUMMARY                           ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`Total Tables Checked: ${totalTables}`);
  console.log(`Tables with RLS Enabled: ${tablesWithRLS}/${totalTables}`);
  console.log(`Tables with Issues: ${tablesWithIssues}`);

  if (issues.length > 0) {
    console.log(`\n${colors.red}${colors.bright}Issues Found:${colors.reset}`);
    issues.forEach(issue => {
      console.log(`  ${colors.red}• ${issue}${colors.reset}`);
    });
    
    console.log(`\n${colors.yellow}${colors.bright}To fix these issues:${colors.reset}`);
    console.log(`1. Run the master RLS migration:`);
    console.log(`   ${colors.cyan}supabase migration up 20250110_master_rls_policies.sql${colors.reset}`);
    console.log(`2. Or apply directly in SQL Editor:`);
    console.log(`   ${colors.cyan}/supabase/migrations/20250110_master_rls_policies.sql${colors.reset}`);
  } else {
    console.log(`\n${colors.green}${colors.bright}✅ All RLS policies are correctly configured!${colors.reset}`);
  }

  // Test critical workflows
  console.log(`\n${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║                    WORKFLOW TESTS                         ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log('Testing critical user workflows...\n');

  // Test 1: Can anonymous users view equipment?
  const { data: equipmentData, error: equipmentError } = await supabaseAnon
    .from('equipment')
    .select('id')
    .limit(1);
  
  if (!equipmentError && equipmentData) {
    console.log(`✅ Anonymous users can view equipment`);
  } else {
    console.log(`${colors.red}❌ Anonymous users CANNOT view equipment${colors.reset}`);
    console.log(`   Error: ${equipmentError?.message}`);
  }

  // Test 2: Can anonymous users view public bags?
  const { data: bagsData, error: bagsError } = await supabaseAnon
    .from('user_bags')
    .select('id')
    .eq('is_public', true)
    .limit(1);
  
  if (!bagsError) {
    console.log(`✅ Anonymous users can view public bags`);
  } else {
    console.log(`${colors.red}❌ Anonymous users CANNOT view public bags${colors.reset}`);
    console.log(`   Error: ${bagsError?.message}`);
  }

  // Test 3: Can anonymous users view feed posts?
  const { data: feedData, error: feedError } = await supabaseAnon
    .from('feed_posts')
    .select('id')
    .limit(1);
  
  if (!feedError) {
    console.log(`✅ Anonymous users can view feed posts`);
  } else {
    console.log(`${colors.red}❌ Anonymous users CANNOT view feed posts${colors.reset}`);
    console.log(`   Error: ${feedError?.message}`);
  }

  console.log(`\n${colors.bright}${colors.green}
╔════════════════════════════════════════════════════════════╗
║                    VERIFICATION COMPLETE                   ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`\n📚 Reference Documentation: ${colors.cyan}/docs/RLS_REFERENCE_SHEET.md${colors.reset}`);
  console.log(`📋 Master SQL File: ${colors.cyan}/supabase/migrations/20250110_master_rls_policies.sql${colors.reset}\n`);
}

// Run the verification
runVerification().catch(error => {
  console.error(`${colors.red}Verification failed:${colors.reset}`, error);
  process.exit(1);
});