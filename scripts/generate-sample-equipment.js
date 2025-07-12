import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Popular golf equipment for 2024
const SAMPLE_EQUIPMENT = [
  // Drivers
  {
    brand: "TaylorMade",
    model: "Qi10",
    category: "driver",
    release_year: 2024,
    msrp: 599.99,
    current_price: 599.99,
    image_url: "https://www.taylormadegolf.com/dw/image/v2/BFXJ_PRD/on/demandware.static/-/Sites-TMaG-Library/default/images/2024/Qi10/Driver/Qi10_Driver_Hero.jpg",
    specifications: {
      loft_options: ["9°", "10.5°", "12°"],
      shaft_options: ["Fujikura Ventus Blue", "Mitsubishi Tensei Blue", "Project X HZRDUS"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  {
    brand: "TaylorMade",
    model: "Qi10 Max",
    category: "driver",
    release_year: 2024,
    msrp: 599.99,
    current_price: 599.99,
    image_url: "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800",
    specifications: {
      loft_options: ["9°", "10.5°", "12°"],
      shaft_options: ["Fujikura Ventus Blue", "UST Mamiya Lin-Q"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  {
    brand: "Callaway",
    model: "Paradym Ai Smoke",
    category: "driver",
    release_year: 2024,
    msrp: 599.99,
    current_price: 549.99,
    image_url: "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800",
    specifications: {
      loft_options: ["9°", "10.5°", "12°"],
      shaft_options: ["Project X Denali", "Mitsubishi Tensei Blue"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  {
    brand: "Titleist",
    model: "TSR3",
    category: "driver",
    release_year: 2023,
    msrp: 599.00,
    current_price: 499.99,
    image_url: "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800",
    specifications: {
      loft_options: ["8°", "9°", "10°"],
      shaft_options: ["Tour AD DI", "HZRDUS Black", "Speeder NX"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  {
    brand: "Ping",
    model: "G430 Max",
    category: "driver",
    release_year: 2023,
    msrp: 575.00,
    current_price: 525.00,
    image_url: "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800",
    specifications: {
      loft_options: ["9°", "10.5°", "12°"],
      shaft_options: ["Alta CB Black", "Tour 2.0 Chrome", "Tour 2.0 Black"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  
  // Irons
  {
    brand: "TaylorMade",
    model: "P790 (2023)",
    category: "irons",
    release_year: 2023,
    msrp: 1399.99,
    current_price: 1299.99,
    image_url: "https://images.unsplash.com/photo-1593111774545-6c9ef863f3f3?w=800",
    specifications: {
      set_makeup: "4-PW (7 clubs)",
      shaft_options: ["KBS Tour", "Dynamic Gold 120", "UST Recoil"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  {
    brand: "Titleist",
    model: "T100",
    category: "irons",
    release_year: 2023,
    msrp: 1499.99,
    current_price: 1399.99,
    image_url: "https://images.unsplash.com/photo-1593111774545-6c9ef863f3f3?w=800",
    specifications: {
      set_makeup: "4-PW (7 clubs)",
      shaft_options: ["True Temper AMT Tour White", "Project X", "KBS Tour"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  {
    brand: "Callaway",
    model: "Apex Pro 24",
    category: "irons",
    release_year: 2024,
    msrp: 1599.99,
    current_price: 1599.99,
    image_url: "https://images.unsplash.com/photo-1593111774545-6c9ef863f3f3?w=800",
    specifications: {
      set_makeup: "4-PW (7 clubs)",
      shaft_options: ["True Temper Elevate", "Project X", "KBS Tour"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  
  // Wedges
  {
    brand: "Titleist",
    model: "Vokey SM10",
    category: "wedges",
    release_year: 2024,
    msrp: 179.99,
    current_price: 179.99,
    image_url: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800",
    specifications: {
      loft_options: ["46°", "48°", "50°", "52°", "54°", "56°", "58°", "60°"],
      bounce_options: ["F Grind", "S Grind", "M Grind", "D Grind", "K Grind"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  {
    brand: "Cleveland",
    model: "RTX 6 ZipCore",
    category: "wedges",
    release_year: 2023,
    msrp: 149.99,
    current_price: 129.99,
    image_url: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800",
    specifications: {
      loft_options: ["46°", "48°", "50°", "52°", "54°", "56°", "58°", "60°"],
      bounce_options: ["Low", "Mid", "Full"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  
  // Putters
  {
    brand: "Scotty Cameron",
    model: "Special Select Newport 2",
    category: "putters",
    release_year: 2023,
    msrp: 449.99,
    current_price: 449.99,
    image_url: "https://images.unsplash.com/photo-1622396636133-ba43f812bc35?w=800",
    specifications: {
      length_options: ["33\"", "34\"", "35\""],
      grip_options: ["Pistolini Plus", "Matador", "Super Stroke"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  {
    brand: "Odyssey",
    model: "White Hot OG #7",
    category: "putters",
    release_year: 2023,
    msrp: 249.99,
    current_price: 229.99,
    image_url: "https://images.unsplash.com/photo-1622396636133-ba43f812bc35?w=800",
    specifications: {
      length_options: ["33\"", "34\"", "35\""],
      grip_options: ["Odyssey Pistol", "Super Stroke"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  
  // Balls
  {
    brand: "Titleist",
    model: "Pro V1",
    category: "balls",
    release_year: 2023,
    msrp: 54.99,
    current_price: 54.99,
    image_url: "https://images.unsplash.com/photo-1557053964-937650b63311?w=800",
    specifications: {
      construction: "3-piece",
      compression: "87",
      dimples: "388"
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  {
    brand: "TaylorMade",
    model: "TP5",
    category: "balls",
    release_year: 2024,
    msrp: 49.99,
    current_price: 49.99,
    image_url: "https://images.unsplash.com/photo-1557053964-937650b63311?w=800",
    specifications: {
      construction: "5-piece",
      compression: "85",
      dimples: "322"
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  {
    brand: "Callaway",
    model: "Chrome Soft",
    category: "balls",
    release_year: 2024,
    msrp: 49.99,
    current_price: 49.99,
    image_url: "https://images.unsplash.com/photo-1557053964-937650b63311?w=800",
    specifications: {
      construction: "3-piece",
      compression: "75",
      dimples: "332"
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  
  // Fairway Woods
  {
    brand: "TaylorMade",
    model: "Qi10 Fairway",
    category: "fairway_woods",
    release_year: 2024,
    msrp: 349.99,
    current_price: 349.99,
    image_url: "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800",
    specifications: {
      loft_options: ["15°", "18°", "21°"],
      shaft_options: ["Fujikura Ventus Blue", "Mitsubishi Tensei Blue"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  {
    brand: "Callaway",
    model: "Paradym Ai Smoke Fairway",
    category: "fairway_woods",
    release_year: 2024,
    msrp: 349.99,
    current_price: 329.99,
    image_url: "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800",
    specifications: {
      loft_options: ["15°", "18°", "21°"],
      shaft_options: ["Project X Denali", "UST Helium"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  
  // Hybrids
  {
    brand: "Ping",
    model: "G430 Hybrid",
    category: "hybrids",
    release_year: 2023,
    msrp: 285.00,
    current_price: 265.00,
    image_url: "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800",
    specifications: {
      loft_options: ["17°", "19°", "22°", "25°", "28°"],
      shaft_options: ["Alta CB Black", "Tour 2.0 Chrome"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  },
  {
    brand: "Titleist",
    model: "TSR2 Hybrid",
    category: "hybrids",
    release_year: 2023,
    msrp: 299.00,
    current_price: 279.00,
    image_url: "https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=800",
    specifications: {
      loft_options: ["18°", "21°", "24°"],
      shaft_options: ["HZRDUS Black", "Mitsubishi Tensei Blue"]
    },
    source: "manual",
    scraped_at: new Date().toISOString()
  }
];

async function generateSampleData() {
  console.log('📝 Generating sample equipment data...\n');
  
  try {
    // Create data directory
    const dataDir = path.join(path.dirname(__dirname), 'data');
    await fs.mkdir(dataDir, { recursive: true });
    
    // Save the data
    const dataPath = path.join(dataDir, 'scraped-equipment.json');
    await fs.writeFile(
      dataPath,
      JSON.stringify(SAMPLE_EQUIPMENT, null, 2)
    );
    
    console.log(`✅ Generated ${SAMPLE_EQUIPMENT.length} equipment items`);
    console.log(`📁 Saved to: ${dataPath}`);
    
    // Count by category
    const categoryCounts = {};
    SAMPLE_EQUIPMENT.forEach(item => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });
    
    console.log('\n📊 Equipment by category:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

generateSampleData().catch(console.error);