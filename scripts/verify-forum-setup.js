import { supabase } from './supabase-admin.js';

async function verifyForumSetup() {
  console.log('🔍 Verifying forum setup...\n');

  try {
    // Check forum tables
    console.log('📊 Checking forum tables:');
    const tables = [
      'forum_categories',
      'forum_threads', 
      'forum_posts',
      'forum_reactions',
      'forum_subscriptions',
      'forum_reports',
      'user_reputation',
      'forum_rate_limits',
      'forum_moderation_log'
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}: Not found or error`);
        } else {
          console.log(`✅ ${table}: Found (${count || 0} rows)`);
        }
      } catch (e) {
        console.log(`❌ ${table}: Error checking`);
      }
    }

    // Check categories
    console.log('\n📁 Forum categories:');
    const { data: categories, error: catError } = await supabase
      .from('forum_categories')
      .select('*')
      .order('sort_order');

    if (catError) {
      console.error('Error fetching categories:', catError);
    } else if (categories && categories.length > 0) {
      categories.forEach(cat => {
        console.log(`  ${cat.icon} ${cat.name} (/${cat.slug})`);
      });
    } else {
      console.log('  No categories found');
    }

    // Check if any threads exist
    console.log('\n💬 Forum activity:');
    const { count: threadCount } = await supabase
      .from('forum_threads')
      .select('*', { count: 'exact', head: true });
    
    const { count: postCount } = await supabase
      .from('forum_posts')
      .select('*', { count: 'exact', head: true });

    console.log(`  Threads: ${threadCount || 0}`);
    console.log(`  Posts: ${postCount || 0}`);

    console.log('\n✅ Forum setup verification complete!');
    console.log('\n📱 You can now:');
    console.log('1. Visit /forum to see the main forum page');
    console.log('2. Click on a category to view threads');
    console.log('3. Create new threads if logged in');
    console.log('4. Reply to threads and add reactions');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Run verification
verifyForumSetup();