import './supabase-admin.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkForumCategories() {
  try {
    console.log('🔍 Checking Forum Categories Structure\n');
    console.log('='.repeat(50));
    
    // Check forum categories without order_index
    console.log('\n📂 Fetching Forum Categories (without order_index):');
    const { data: categories, error: catError } = await supabase
      .from('forum_categories')
      .select('*');
    
    if (catError) {
      console.error('Error fetching categories:', catError);
      return;
    }
    
    console.log(`Found ${categories?.length || 0} categories:`);
    
    if (categories && categories.length > 0) {
      categories.forEach(cat => {
        console.log(`\n  Category: ${cat.name}`);
        console.log(`    ID: ${cat.id}`);
        console.log(`    Slug: ${cat.slug}`);
        console.log(`    Icon: ${cat.icon}`);
        console.log(`    Description: ${cat.description}`);
        console.log(`    Fields: ${Object.keys(cat).join(', ')}`);
      });
    } else {
      console.log('  ❌ No categories found!');
      console.log('\n  Creating default categories...');
      
      // Create default categories
      const defaultCategories = [
        {
          name: 'General Discussion',
          slug: 'general',
          icon: '💬',
          description: 'General golf discussions and conversations'
        },
        {
          name: 'Equipment Discussions',
          slug: 'equipment',
          icon: '🏌️',
          description: 'Talk about golf clubs, balls, and gear'
        },
        {
          name: 'Golf Tips & Techniques',
          slug: 'tips',
          icon: '🎯',
          description: 'Share and learn golf tips, techniques, and strategies'
        },
        {
          name: 'Golf Courses',
          slug: 'courses',
          icon: '⛳',
          description: 'Discuss your favorite golf courses and experiences'
        },
        {
          name: 'Site Feedback',
          slug: 'feedback',
          icon: '💭',
          description: 'Suggestions and feedback for Teed.club'
        }
      ];
      
      for (const category of defaultCategories) {
        const { data, error } = await supabase
          .from('forum_categories')
          .insert(category)
          .select()
          .single();
        
        if (error) {
          console.error(`  ❌ Error creating category ${category.name}:`, error);
        } else {
          console.log(`  ✅ Created category: ${data.icon} ${data.name}`);
        }
      }
    }
    
    // Check if threads reference valid categories
    console.log('\n🔍 Checking Thread-Category Relationships:');
    const { data: threads } = await supabase
      .from('forum_threads')
      .select('id, title, category_id');
    
    if (threads && threads.length > 0) {
      const categoryIds = categories?.map(c => c.id) || [];
      const orphanedThreads = threads.filter(t => !categoryIds.includes(t.category_id));
      
      if (orphanedThreads.length > 0) {
        console.log(`  ⚠️  Found ${orphanedThreads.length} threads with invalid category IDs`);
        orphanedThreads.forEach(t => {
          console.log(`    - "${t.title}" (category_id: ${t.category_id})`);
        });
      } else {
        console.log('  ✅ All threads have valid categories');
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkForumCategories();