# Equipment Data Collection Guide for Teed.club

## Overview
This guide provides multiple approaches to populate your Teed.club database with golf equipment data.

## Option 1: Web Scraping (Automated)

### Setup
```bash
# Install required dependencies
npm install puppeteer cheerio axios

# Run the scraper
node scripts/equipment-scraper.js
```

### Legal Considerations
- Always check robots.txt before scraping
- Respect rate limits
- Consider reaching out for official API access
- Use scraped data responsibly

### Recommended Sources to Scrape
1. **Manufacturer Websites** (Most reliable)
   - TaylorMade.com
   - Callaway.com
   - Titleist.com
   - Ping.com
   - Mizuno.com
   - Cobra.com

2. **Golf Retailers** (Broader selection)
   - TGW.com
   - GolfGalaxy.com
   - 2ndSwing.com (includes used prices)
   - PGA Tour Superstore

## Option 2: Official APIs and Partnerships

### Golf Equipment APIs
1. **Golf Datatech** - Industry-standard golf data provider
   - Contact: https://golfdatatech.com
   - Provides: Sales data, equipment specs, pricing

2. **MyGolfSpy Data** - Equipment testing data
   - Contact for API access
   - Provides: Performance metrics, user reviews

3. **Manufacturer Direct**
   - Reach out to brand marketing departments
   - Many provide product feeds for affiliates

### Sample API Integration
```javascript
// Example integration with a golf equipment API
async function fetchFromAPI() {
  const response = await fetch('https://api.golfequipment.com/products', {
    headers: {
      'Authorization': `Bearer ${process.env.GOLF_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data.products.map(product => ({
    brand: product.manufacturer,
    model: product.name,
    category: mapCategory(product.type),
    msrp: product.retail_price,
    image_url: product.images[0]?.url,
    specs: product.specifications
  }));
}
```

## Option 3: Manual Data Entry Tools

### Bulk Import Script
```javascript
// scripts/bulk-import-equipment.js
import { createClient } from '@supabase/supabase-js';
import equipmentData from './equipment-data.json';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function bulkImport() {
  const { data, error } = await supabase
    .from('equipment')
    .insert(equipmentData);
    
  if (error) {
    console.error('Import failed:', error);
  } else {
    console.log(`Imported ${data.length} items successfully!`);
  }
}

bulkImport();
```

### CSV Import Template
Create a CSV with these columns:
```
brand,model,category,msrp,image_url,release_year,shaft_options,grip_options
TaylorMade,Stealth 2 Plus,driver,599.99,https://...,2023,"Ventus|Speeder|HZRDUS","Golf Pride|Lamkin"
```

## Option 4: Community Sourcing

### User-Generated Content
1. Allow users to submit equipment they can't find
2. Implement moderation queue
3. Reward contributors with badges/credits

### Implementation
```javascript
// API endpoint for user submissions
app.post('/api/equipment/submit', async (req, res) => {
  const { brand, model, category, msrp, proof_url } = req.body;
  
  // Add to pending_equipment table
  const { data, error } = await supabase
    .from('pending_equipment')
    .insert({
      ...req.body,
      submitted_by: req.user.id,
      status: 'pending_review'
    });
    
  // Notify moderators
  await notifyModerators(data);
  
  res.json({ success: true, message: 'Equipment submitted for review' });
});
```

## Option 5: Equipment Databases

### Free/Open Sources
1. **USGA Conforming Club Database**
   - URL: https://www.usga.org/equipment-standards/equipment-rules-2019/conforming-club-lists.html
   - Contains: All conforming drivers, balls
   - Format: PDF (needs parsing)

2. **R&A Equipment Database**
   - Similar to USGA
   - International equipment

### Paid Data Sources
1. **Golf Datatech** (~$5,000-50,000/year)
   - Complete equipment database
   - Historical data
   - Market share data

2. **TrackMan Database**
   - Performance data
   - Tour player equipment

## Data Structure Best Practices

### Essential Fields
```javascript
{
  // Required
  brand: "TaylorMade",
  model: "Stealth 2 Plus",
  category: "driver",
  msrp: 599.99,
  
  // Highly Recommended
  image_url: "https://...",
  release_date: "2023-02-01",
  specs: {
    loft_options: ["8°", "9°", "10.5°"],
    shaft_length: "45.75",
    head_size: "460cc"
  },
  
  // Nice to Have
  description: "Low spin driver for better players...",
  technology: ["Carbon Twist Face", "60X Carbon"],
  tour_usage: ["Rory McIlroy", "Tiger Woods"],
  awards: ["Golf Digest Hot List Gold 2023"]
}
```

### Category Standardization
Always map to these categories:
- driver
- fairway_wood
- hybrid
- iron
- wedge
- putter
- balls
- gloves
- bags
- accessories

## Quick Start: Get 1000+ Items Fast

### Step 1: Use the 2ndSwing API approach
```bash
# This gets a broad selection quickly
node scripts/scrape-2ndswing.js
```

### Step 2: Enhance with manufacturer data
```bash
# Add official product images and specs
node scripts/enhance-equipment-data.js
```

### Step 3: Add current year releases
```bash
# Scrape 2024 equipment from Golf Digest Hot List
node scripts/scrape-hotlist-2024.js
```

## Automation Tips

### Daily Updates
```javascript
// Set up a cron job to check for new equipment
// scripts/daily-equipment-update.js
import cron from 'node-cron';

cron.schedule('0 3 * * *', async () => {
  console.log('Running daily equipment update...');
  
  // Check each brand's "new arrivals" page
  const brands = ['taylormade', 'callaway', 'titleist', 'ping'];
  
  for (const brand of brands) {
    await checkNewArrivals(brand);
  }
});
```

### Price Monitoring
Track price changes for dynamic pricing data:
```javascript
async function updatePrices() {
  const equipment = await supabase
    .from('equipment')
    .select('id, brand, model')
    .gte('created_at', lastWeek);
    
  for (const item of equipment) {
    const currentPrice = await scrapeCurrentPrice(item);
    if (currentPrice !== item.msrp) {
      await supabase
        .from('price_history')
        .insert({
          equipment_id: item.id,
          price: currentPrice,
          date: new Date()
        });
    }
  }
}
```

## Legal & Ethical Guidelines

1. **Always respect robots.txt**
2. **Add delays between requests** (2-5 seconds)
3. **Identify your bot** in User-Agent
4. **Cache data** to minimize requests
5. **Consider reaching out** to sites before scraping
6. **Never scrape personal data**
7. **Attribute sources** when required

## Contact for Help

If you need assistance with data collection:
1. Check the Teed.club Discord #data-collection channel
2. Email: data@teed.club
3. Submit ideas: github.com/teed-club/equipment-sources

Remember: Quality > Quantity. It's better to have 500 complete, accurate equipment entries than 5000 incomplete ones.