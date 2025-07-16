import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Badge definitions with all 48 badges
const badgeDefinitions = [
  // Social & Achievement Badges
  { id: 1, name: "Rising Star", description: "Receive 10 tees on your bag", category: "social", icon: "star", color: "#10B981", rarity: "common" },
  { id: 2, name: "Crowd Favorite", description: "Receive 50 tees on your bag", category: "social", icon: "crown", color: "#FFD700", rarity: "uncommon" },
  { id: 3, name: "Tee Legend", description: "Receive 100 tees on your bag", category: "social", icon: "trophy", color: "#FF6B6B", rarity: "rare" },
  
  // Community Contributor
  { id: 4, name: "First Review", description: "Write your first equipment review", category: "community", icon: "message-circle", color: "#10B981", rarity: "common" },
  { id: 5, name: "Helpful Reviewer", description: "Write 5 equipment reviews", category: "community", icon: "edit", color: "#3B82F6", rarity: "uncommon" },
  { id: 6, name: "Review Expert", description: "Write 10 detailed equipment reviews", category: "community", icon: "award", color: "#8B5CF6", rarity: "rare" },
  { id: 7, name: "Photo Enthusiast", description: "Upload 10 equipment photos", category: "community", icon: "camera", color: "#06B6D4", rarity: "uncommon" },
  
  // Milestone Achievement
  { id: 8, name: "Early Adopter", description: "Join Teed.club in the first year", category: "milestone", icon: "zap", color: "#F59E0B", rarity: "legendary" },
  { id: 9, name: "Complete Profile", description: "Fill out all profile information", category: "milestone", icon: "user-check", color: "#10B981", rarity: "common" },
  
  // Equipment Explorer
  { id: 10, name: "Brand Curious", description: "Try equipment from 3 different brands", category: "explorer", icon: "compass", color: "#10B981", rarity: "common" },
  { id: 11, name: "Brand Enthusiast", description: "Try equipment from 5 different brands", category: "explorer", icon: "map", color: "#3B82F6", rarity: "uncommon" },
  { id: 12, name: "Brand Connoisseur", description: "Try equipment from 10 different brands", category: "explorer", icon: "globe", color: "#8B5CF6", rarity: "epic" },
  
  // Gear Collector
  { id: 13, name: "Starter Set", description: "Add 7 items to your bag", category: "collector", icon: "package", color: "#10B981", rarity: "common" },
  { id: 14, name: "Full Bag", description: "Add 14 items to your bag", category: "collector", icon: "briefcase", color: "#3B82F6", rarity: "uncommon" },
  { id: 15, name: "Premium Collection", description: "Own equipment worth over $5,000", category: "collector", icon: "gem", color: "#F59E0B", rarity: "epic" },
  
  // Major Manufacturers (16-25)
  { id: 16, name: "Titleist Owner", description: "Own equipment from Titleist", category: "brand", brand: "Titleist", color: "#000000", rarity: "common" },
  { id: 17, name: "TaylorMade Owner", description: "Own equipment from TaylorMade", category: "brand", brand: "TaylorMade", color: "#FFFFFF", rarity: "common" },
  { id: 18, name: "Callaway Owner", description: "Own equipment from Callaway", category: "brand", brand: "Callaway", color: "#FFD700", rarity: "common" },
  { id: 19, name: "Ping Owner", description: "Own equipment from Ping", category: "brand", brand: "Ping", color: "#FF6B6B", rarity: "common" },
  { id: 20, name: "Cobra Owner", description: "Own equipment from Cobra", category: "brand", brand: "Cobra", color: "#F59E0B", rarity: "common" },
  { id: 21, name: "Mizuno Owner", description: "Own equipment from Mizuno", category: "brand", brand: "Mizuno", color: "#3B82F6", rarity: "common" },
  { id: 22, name: "Srixon Owner", description: "Own equipment from Srixon", category: "brand", brand: "Srixon", color: "#10B981", rarity: "common" },
  { id: 23, name: "Cleveland Owner", description: "Own equipment from Cleveland", category: "brand", brand: "Cleveland", color: "#8B5CF6", rarity: "common" },
  { id: 24, name: "Wilson Owner", description: "Own equipment from Wilson", category: "brand", brand: "Wilson", color: "#EF4444", rarity: "common" },
  { id: 25, name: "PXG Owner", description: "Own equipment from PXG", category: "brand", brand: "PXG", color: "#000000", rarity: "uncommon" },
  
  // Premium Putter Brands (26-30)
  { id: 26, name: "Scotty Cameron Owner", description: "Own a Scotty Cameron putter", category: "brand", brand: "Scotty Cameron", color: "#FFD700", rarity: "rare" },
  { id: 27, name: "Odyssey Owner", description: "Own an Odyssey putter", category: "brand", brand: "Odyssey", color: "#FFFFFF", rarity: "common" },
  { id: 28, name: "Bettinardi Owner", description: "Own a Bettinardi putter", category: "brand", brand: "Bettinardi", color: "#FF6B6B", rarity: "rare" },
  { id: 29, name: "Evnroll Owner", description: "Own an Evnroll putter", category: "brand", brand: "Evnroll", color: "#10B981", rarity: "uncommon" },
  { id: 30, name: "L.A.B. Owner", description: "Own a L.A.B. putter", category: "brand", brand: "L.A.B.", color: "#3B82F6", rarity: "uncommon" },
  
  // Other Equipment Brands (31-36)
  { id: 31, name: "Honma Owner", description: "Own equipment from Honma", category: "brand", brand: "Honma", color: "#FFD700", rarity: "rare" },
  { id: 32, name: "Bridgestone Owner", description: "Own equipment from Bridgestone", category: "brand", brand: "Bridgestone", color: "#000000", rarity: "common" },
  { id: 33, name: "Tour Edge Owner", description: "Own equipment from Tour Edge", category: "brand", brand: "Tour Edge", color: "#10B981", rarity: "uncommon" },
  { id: 34, name: "XXIO Owner", description: "Own equipment from XXIO", category: "brand", brand: "XXIO", color: "#3B82F6", rarity: "uncommon" },
  { id: 35, name: "Miura Owner", description: "Own equipment from Miura", category: "brand", brand: "Miura", color: "#8B5CF6", rarity: "epic" },
  { id: 36, name: "Ben Hogan Owner", description: "Own equipment from Ben Hogan", category: "brand", brand: "Ben Hogan", color: "#EF4444", rarity: "rare" },
  
  // Ball Brands (37-40)
  { id: 37, name: "Vice Owner", description: "Own Vice golf balls", category: "brand", brand: "Vice", color: "#FF6B6B", rarity: "uncommon" },
  { id: 38, name: "Snell Owner", description: "Own Snell golf balls", category: "brand", brand: "Snell", color: "#10B981", rarity: "uncommon" },
  { id: 39, name: "OnCore Owner", description: "Own OnCore golf balls", category: "brand", brand: "OnCore", color: "#F59E0B", rarity: "uncommon" },
  { id: 40, name: "Maxfli Owner", description: "Own Maxfli golf balls", category: "brand", brand: "Maxfli", color: "#3B82F6", rarity: "common" },
  
  // Accessory Brands (41-46)
  { id: 41, name: "FootJoy Owner", description: "Own FootJoy equipment", category: "brand", brand: "FootJoy", color: "#FFFFFF", rarity: "common" },
  { id: 42, name: "Bushnell Owner", description: "Own a Bushnell rangefinder", category: "brand", brand: "Bushnell", color: "#10B981", rarity: "common" },
  { id: 43, name: "Garmin Owner", description: "Own a Garmin device", category: "brand", brand: "Garmin", color: "#3B82F6", rarity: "common" },
  { id: 44, name: "SkyCaddie Owner", description: "Own a SkyCaddie device", category: "brand", brand: "SkyCaddie", color: "#06B6D4", rarity: "uncommon" },
  { id: 45, name: "Pride Owner", description: "Own Pride tees", category: "brand", brand: "Pride", color: "#8B5CF6", rarity: "common" },
  { id: 46, name: "Zero Friction Owner", description: "Own Zero Friction equipment", category: "brand", brand: "Zero Friction", color: "#EF4444", rarity: "common" },
  
  // Legacy Brands (47-48)
  { id: 47, name: "Nike Owner", description: "Own Nike golf equipment", category: "brand", brand: "Nike", color: "#000000", rarity: "rare" },
  { id: 48, name: "Adams Owner", description: "Own Adams golf equipment", category: "brand", brand: "Adams", color: "#3B82F6", rarity: "rare" }
];

// Rarity colors and glow effects
const rarityColors = {
  common: { border: '#6B7280', glow: 'rgba(107, 114, 128, 0.3)' },
  uncommon: { border: '#10B981', glow: 'rgba(16, 185, 129, 0.4)' },
  rare: { border: '#3B82F6', glow: 'rgba(59, 130, 246, 0.5)' },
  epic: { border: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.6)' },
  legendary: { border: '#F59E0B', glow: 'rgba(245, 158, 11, 0.7)' }
};

// Icon SVG paths (simplified versions)
const iconPaths = {
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  crown: 'M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z',
  trophy: 'M6 9V2h12v7c0 2.21-1.79 4-4 4h-4c-2.21 0-4-1.79-4-4z M5 9H2c0 2.21 1.79 4 4 4 M19 9h3c0 2.21-1.79 4-4 4 M12 13v9 M8 22h8',
  'message-circle': 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
  edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  award: 'M12 15l-8.5 4.5 1.63-9.5L.5 5.5l9.38-1.37L12 .5l2.13 3.63L23.5 5.5 18.87 10l1.63 9.5z',
  camera: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 13a4 4 0 100-8 4 4 0 000 8z',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  'user-check': 'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M8.5 11a4 4 0 100-8 4 4 0 000 8z M20 8v6 M23 11h-6',
  compass: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z',
  map: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z M8 2v16 M16 6v16',
  globe: 'M12 2a10 10 0 100 20 10 10 0 000-20z M2 12h20 M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z',
  package: 'M16.5 9.4l-9-5.19 M12 3.86v10 M21 12v7a2 2 0 01-1 1.73l-7 4a2 2 0 01-2 0l-7-4A2 2 0 013 19v-7 M3.27 6.96l8.73 5.04 8.73-5.04 M12 22.02V12',
  briefcase: 'M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M8 5h8v2H8V5z',
  gem: 'M6 3h12l4 6-10 13L2 9z'
};

// Generate a single badge SVG
function generateBadgeSVG(badge) {
  const rarity = rarityColors[badge.rarity];
  const isWhiteColor = badge.color === '#FFFFFF';
  const textColor = isWhiteColor ? '#000000' : '#FFFFFF';
  
  // Base SVG template with glassmorphism
  let svg = `<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Glassmorphism filter -->
    <filter id="glass-${badge.id}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8"/>
      <feComponentTransfer>
        <feFuncA type="discrete" tableValues="1 1"/>
      </feComponentTransfer>
    </filter>
    
    <!-- Badge gradient -->
    <linearGradient id="grad-${badge.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${badge.color};stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:${badge.color};stop-opacity:0.4" />
    </linearGradient>
    
    <!-- Rarity glow -->
    <filter id="glow-${badge.id}">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background circle with glow -->
  <circle cx="128" cy="128" r="110" 
    fill="rgba(0,0,0,0.5)" 
    stroke="${rarity.border}" 
    stroke-width="4"
    filter="url(#glow-${badge.id})"
    style="filter: drop-shadow(0 0 20px ${rarity.glow})"/>
  
  <!-- Glass effect layer -->
  <circle cx="128" cy="128" r="106" 
    fill="url(#grad-${badge.id})" 
    opacity="0.9"/>
  
  <!-- Inner glass rim -->
  <circle cx="128" cy="128" r="106" 
    fill="none" 
    stroke="rgba(255,255,255,0.2)" 
    stroke-width="1"/>
  `;

  if (badge.category === 'brand') {
    // Brand badges with text
    const fontSize = badge.brand.length > 10 ? '20' : '24';
    const lines = badge.brand.includes(' ') ? badge.brand.split(' ') : [badge.brand];
    
    svg += `
  <!-- Brand name -->
  <text x="128" y="${lines.length > 1 ? '120' : '128'}" 
    font-family="Arial, sans-serif" 
    font-size="${fontSize}" 
    font-weight="bold" 
    fill="${textColor}" 
    text-anchor="middle" 
    dominant-baseline="middle">`;
    
    lines.forEach((line, i) => {
      svg += `
    <tspan x="128" dy="${i === 0 ? 0 : 28}">${line}</tspan>`;
    });
    
    svg += `
  </text>`;
  } else {
    // Icon badges
    const iconPath = iconPaths[badge.icon] || iconPaths.star;
    svg += `
  <!-- Icon -->
  <g transform="translate(128, 128)">
    <path d="${iconPath}" 
      fill="${textColor}" 
      stroke="${textColor}" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      transform="scale(4) translate(-12, -12)"/>
  </g>`;
  }

  // Add badge name at bottom
  svg += `
  <!-- Badge name -->
  <text x="128" y="200" 
    font-family="Arial, sans-serif" 
    font-size="16" 
    font-weight="600" 
    fill="${textColor}" 
    text-anchor="middle"
    opacity="0.9">${badge.name}</text>
  
  <!-- Tier indicator -->`;
  
  // Add tier dots for multi-tier badges
  if (['social', 'community', 'explorer', 'collector'].includes(badge.category)) {
    const tierLevel = badge.rarity === 'common' ? 1 : badge.rarity === 'uncommon' ? 2 : 3;
    for (let i = 0; i < 3; i++) {
      svg += `
  <circle cx="${108 + i * 20}" cy="220" r="4" 
    fill="${i < tierLevel ? textColor : 'rgba(255,255,255,0.3)'}" />`;
    }
  }

  svg += `
</svg>`;

  return svg;
}

// Main function to generate all badges
async function generateAllBadges() {
  console.log('🏅 Teed.club Badge Generation System');
  console.log('====================================\n');
  
  // Create output directory
  const outputDir = path.join(__dirname, '..', 'public', 'badges');
  await fs.mkdir(outputDir, { recursive: true });
  
  console.log(`📁 Output directory: ${outputDir}\n`);
  
  // Generate each badge
  for (const badge of badgeDefinitions) {
    const svg = generateBadgeSVG(badge);
    const filename = badge.name.toLowerCase().replace(/\s+/g, '-') + '.svg';
    const filepath = path.join(outputDir, filename);
    
    await fs.writeFile(filepath, svg);
    console.log(`✅ Generated: ${filename} (${badge.category} - ${badge.rarity})`);
  }
  
  // Generate badge manifest
  const manifest = {
    badges: badgeDefinitions.map(badge => ({
      ...badge,
      filename: badge.name.toLowerCase().replace(/\s+/g, '-') + '.svg'
    })),
    totalCount: badgeDefinitions.length,
    categories: [...new Set(badgeDefinitions.map(b => b.category))],
    rarities: [...new Set(badgeDefinitions.map(b => b.rarity))]
  };
  
  await fs.writeFile(
    path.join(outputDir, 'manifest.json'), 
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('\n📋 Badge generation complete!');
  console.log(`   Total badges: ${badgeDefinitions.length}`);
  console.log(`   Categories: ${manifest.categories.join(', ')}`);
  console.log(`   Rarities: ${manifest.rarities.join(', ')}`);
  
  // Generate preview HTML
  const previewHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Teed.club Badge Preview</title>
  <style>
    body {
      background: #111;
      color: white;
      font-family: Arial, sans-serif;
      padding: 20px;
    }
    .badge-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .badge-item {
      text-align: center;
    }
    .badge-item img {
      width: 128px;
      height: 128px;
    }
    .badge-name {
      margin-top: 8px;
      font-size: 12px;
      color: #10B981;
    }
    .badge-rarity {
      font-size: 10px;
      color: #666;
    }
    h2 {
      color: #10B981;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <h1>Teed.club Badge System - All ${badgeDefinitions.length} Badges</h1>
  ${[...new Set(badgeDefinitions.map(b => b.category))].map(category => `
  <h2>${category.charAt(0).toUpperCase() + category.slice(1)} Badges</h2>
  <div class="badge-grid">
    ${badgeDefinitions.filter(b => b.category === category).map(badge => `
    <div class="badge-item">
      <img src="${badge.name.toLowerCase().replace(/\s+/g, '-')}.svg" alt="${badge.name}">
      <div class="badge-name">${badge.name}</div>
      <div class="badge-rarity">${badge.rarity}</div>
    </div>`).join('')}
  </div>`).join('')}
</body>
</html>`;
  
  await fs.writeFile(path.join(outputDir, 'preview.html'), previewHtml);
  console.log('\n🌐 Preview page generated: public/badges/preview.html');
}

// Run the generator
generateAllBadges().catch(console.error);