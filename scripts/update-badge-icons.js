import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateBadgeIcons() {
  console.log('🎨 Updating Badge Icons to use Generated SVGs');
  console.log('===========================================\n');
  
  const badgeUpdates = [
    { name: 'Rising Star', icon: '/badges/rising-star.svg' },
    { name: 'Crowd Favorite', icon: '/badges/crowd-favorite.svg' },
    { name: 'Tee Legend', icon: '/badges/tee-legend.svg' },
    { name: 'First Review', icon: '/badges/first-review.svg' },
    { name: 'Helpful Reviewer', icon: '/badges/helpful-reviewer.svg' },
    { name: 'Review Expert', icon: '/badges/review-expert.svg' },
    { name: 'Photo Enthusiast', icon: '/badges/photo-enthusiast.svg' },
    { name: 'Early Adopter', icon: '/badges/early-adopter.svg' },
    { name: 'Complete Profile', icon: '/badges/complete-profile.svg' },
    { name: 'Brand Curious', icon: '/badges/brand-curious.svg' },
    { name: 'Brand Enthusiast', icon: '/badges/brand-enthusiast.svg' },
    { name: 'Brand Connoisseur', icon: '/badges/brand-connoisseur.svg' },
    { name: 'Starter Set', icon: '/badges/starter-set.svg' },
    { name: 'Full Bag', icon: '/badges/full-bag.svg' },
    { name: 'Premium Collection', icon: '/badges/premium-collection.svg' },
    { name: 'Titleist Owner', icon: '/badges/titleist-owner.svg' },
    { name: 'TaylorMade Owner', icon: '/badges/taylormade-owner.svg' },
    { name: 'Callaway Owner', icon: '/badges/callaway-owner.svg' },
    { name: 'Ping Owner', icon: '/badges/ping-owner.svg' },
    { name: 'Cobra Owner', icon: '/badges/cobra-owner.svg' },
    { name: 'Mizuno Owner', icon: '/badges/mizuno-owner.svg' },
    { name: 'Srixon Owner', icon: '/badges/srixon-owner.svg' },
    { name: 'Cleveland Owner', icon: '/badges/cleveland-owner.svg' },
    { name: 'Wilson Owner', icon: '/badges/wilson-owner.svg' },
    { name: 'PXG Owner', icon: '/badges/pxg-owner.svg' },
    { name: 'Scotty Cameron Owner', icon: '/badges/scotty-cameron-owner.svg' },
    { name: 'Odyssey Owner', icon: '/badges/odyssey-owner.svg' },
    { name: 'Bettinardi Owner', icon: '/badges/bettinardi-owner.svg' },
    { name: 'Evnroll Owner', icon: '/badges/evnroll-owner.svg' },
    { name: 'L.A.B. Owner', icon: '/badges/l.a.b.-owner.svg' },
    { name: 'Honma Owner', icon: '/badges/honma-owner.svg' },
    { name: 'Bridgestone Owner', icon: '/badges/bridgestone-owner.svg' },
    { name: 'Tour Edge Owner', icon: '/badges/tour-edge-owner.svg' },
    { name: 'XXIO Owner', icon: '/badges/xxio-owner.svg' },
    { name: 'Miura Owner', icon: '/badges/miura-owner.svg' },
    { name: 'Ben Hogan Owner', icon: '/badges/ben-hogan-owner.svg' },
    { name: 'Vice Owner', icon: '/badges/vice-owner.svg' },
    { name: 'Snell Owner', icon: '/badges/snell-owner.svg' },
    { name: 'OnCore Owner', icon: '/badges/oncore-owner.svg' },
    { name: 'Maxfli Owner', icon: '/badges/maxfli-owner.svg' },
    { name: 'FootJoy Owner', icon: '/badges/footjoy-owner.svg' },
    { name: 'Bushnell Owner', icon: '/badges/bushnell-owner.svg' },
    { name: 'Garmin Owner', icon: '/badges/garmin-owner.svg' },
    { name: 'SkyCaddie Owner', icon: '/badges/skycaddie-owner.svg' },
    { name: 'Pride Owner', icon: '/badges/pride-owner.svg' },
    { name: 'Zero Friction Owner', icon: '/badges/zero-friction-owner.svg' },
    { name: 'Nike Owner', icon: '/badges/nike-owner.svg' },
    { name: 'Adams Owner', icon: '/badges/adams-owner.svg' }
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const update of badgeUpdates) {
    const { error } = await supabase
      .from('badges')
      .update({ icon: update.icon })
      .eq('name', update.name);
      
    if (error) {
      console.error(`❌ Failed to update ${update.name}:`, error.message);
      errorCount++;
    } else {
      console.log(`✅ Updated ${update.name}`);
      successCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Successfully updated: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 All badge icons updated successfully!');
  } else {
    console.log('\n⚠️  Some updates failed. Please check the errors above.');
  }
}

// Run the update
updateBadgeIcons();