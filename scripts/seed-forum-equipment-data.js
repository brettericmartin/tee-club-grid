import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedForumEquipmentData() {
  console.log('Seeding forum data with equipment tags...\n');

  try {
    // Get a demo user
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1);
    
    if (!users || users.length === 0) {
      console.error('No users found. Please create a user first.');
      return;
    }
    const userId = users[0].id;
    console.log(`Using user: ${users[0].username || 'Demo User'}`);

    // Get equipment to tag
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, brand, model, category')
      .in('category', ['driver', 'putter', 'iron', 'wedge'])
      .limit(20);
    
    if (!equipment || equipment.length === 0) {
      console.error('No equipment found.');
      return;
    }

    // Get forum categories
    const { data: categories } = await supabase
      .from('forum_categories')
      .select('id, name, slug');
    
    if (!categories || categories.length === 0) {
      console.error('No forum categories found.');
      return;
    }

    // Forum thread ideas with equipment tags
    const threadIdeas = [
      {
        title: "Best drivers for high handicappers in 2025",
        content: "Looking for forgiving drivers that can help with my slice. What are you all gaming?",
        categorySlug: 'equipment',
        equipmentTypes: ['driver'],
        teeCount: 42
      },
      {
        title: "Scotty Cameron vs Odyssey - which putter gives you more confidence?",
        content: "I've been testing both brands and curious what others think. The feel is so different!",
        categorySlug: 'equipment',
        equipmentTypes: ['putter'],
        teeCount: 38
      },
      {
        title: "Iron shaft recommendations for 95mph swing speed",
        content: "Currently playing regular flex but thinking I might need to go to stiff. What shafts are working for you at similar speeds?",
        categorySlug: 'equipment',
        equipmentTypes: ['iron'],
        teeCount: 27
      },
      {
        title: "Wedge setup - how many do you carry?",
        content: "I'm debating between 3 or 4 wedges. Currently have PW (46°), 52°, 56°, and 60°. Is that overkill?",
        categorySlug: 'equipment',
        equipmentTypes: ['wedge'],
        teeCount: 19
      },
      {
        title: "Driver fitting experience at TaylorMade",
        content: "Just got fitted for the new Qi10 and wanted to share my experience. The technology is incredible!",
        categorySlug: 'equipment',
        equipmentTypes: ['driver'],
        teeCount: 15
      }
    ];

    for (const threadIdea of threadIdeas) {
      // Find the category
      const category = categories.find(c => c.slug === threadIdea.categorySlug);
      if (!category) continue;

      // Create thread
      const { data: thread, error: threadError } = await supabase
        .from('forum_threads')
        .insert({
          title: threadIdea.title,
          slug: threadIdea.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          category_id: category.id,
          user_id: userId,
          tee_count: threadIdea.teeCount
        })
        .select()
        .single();
      
      if (threadError) {
        console.error(`Failed to create thread "${threadIdea.title}":`, threadError.message);
        continue;
      }

      // Create initial post
      const { data: post, error: postError } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: thread.id,
          content: threadIdea.content,
          user_id: userId
        })
        .select()
        .single();
      
      if (postError) {
        console.error(`Failed to create post for thread "${threadIdea.title}":`, postError.message);
        continue;
      }

      // Tag relevant equipment
      const relevantEquipment = equipment.filter(e => 
        threadIdea.equipmentTypes.includes(e.category)
      );
      
      if (relevantEquipment.length > 0) {
        // Tag 2-3 random equipment items
        const numToTag = Math.min(relevantEquipment.length, Math.floor(Math.random() * 2) + 2);
        const equipmentToTag = relevantEquipment
          .sort(() => Math.random() - 0.5)
          .slice(0, numToTag);
        
        const tags = equipmentToTag.map(e => ({
          post_id: post.id,
          equipment_id: e.id
        }));

        const { error: tagError } = await supabase
          .from('forum_equipment_tags')
          .insert(tags);
        
        if (tagError) {
          console.error(`Failed to tag equipment:`, tagError.message);
        } else {
          console.log(`✅ Created thread: "${threadIdea.title}" with ${numToTag} equipment tags`);
        }
      }
    }

    console.log('\n✨ Forum equipment seeding complete!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seedForumEquipmentData();