# Equipment Scraping System Guide

## Overview
This system uses Puppeteer to scrape golf equipment data from various sources and import it into your Supabase database.

## Setup

1. **Install dependencies:**
   ```bash
   npm install puppeteer
   ```

2. **Test Puppeteer works:**
   ```bash
   npm run scrape:test
   ```
   This opens a browser window and takes a screenshot to verify everything is working.

## Available Scripts

### Individual Commands

- `npm run scrape:test` - Test Puppeteer setup
- `npm run scrape:golf` - Scrape equipment from Golf Galaxy
- `npm run scrape:2ndswing` - Scrape equipment from 2nd Swing
- `npm run scrape:images` - Download product images locally
- `npm run scrape:import` - Import scraped data to Supabase

### All-in-One Command

```bash
npm run scrape:all
```
This runs the complete pipeline:
1. Scrapes equipment data
2. Downloads images
3. Imports to Supabase

## Output Files

- `data/scraped-equipment.json` - Raw scraped data
- `data/scraped-equipment-with-images.json` - Data with local image paths
- `data/scrape-errors.log` - Any errors encountered
- `public/images/equipment/` - Downloaded product images

## Scraped Data Format

```json
{
  "brand": "TaylorMade",
  "model": "Qi10 Max",
  "category": "driver",
  "release_year": 2024,
  "msrp": 599.99,
  "current_price": 599.99,
  "image_url": "https://...",
  "product_url": "https://...",
  "source": "golf-galaxy",
  "scraped_at": "2024-01-12T..."
}
```

## Customization

### Add New Categories
Edit `CONFIG.categories` in `scripts/scrape-golf-equipment.js`:
```javascript
categories: {
  drivers: '/c/golf-drivers',
  balls: '/c/golf-balls',
  // Add more categories here
}
```

### Change Max Products
Edit `CONFIG.maxProductsPerCategory`:
```javascript
maxProductsPerCategory: 20, // Default is 15
```

### Add New Sources
Create a new scraper file following the pattern in `scrape-golf-equipment.js` and update the selectors for the target website.

## Troubleshooting

### "No usable sandbox" Error
The scripts already include `--no-sandbox` flag. If you still have issues:
```bash
sudo apt-get install chromium-browser
```

### Timeout Errors
Increase the timeout in CONFIG:
```javascript
timeout: 60000, // 60 seconds
```

### No Products Found
The website may have changed their HTML structure. Update the selectors in the `scrapeCategoryPage` function.

### Rate Limiting
Increase the delay between requests:
```javascript
delayBetweenRequests: 5000, // 5 seconds
```

## Best Practices

1. **Respect robots.txt** - Check if the website allows scraping
2. **Add delays** - Don't overwhelm servers with requests
3. **Handle errors gracefully** - Log errors and continue
4. **Save progress frequently** - The scraper saves after each category
5. **Test with small batches first** - Set `maxProductsPerCategory: 5` for testing

## Manual Product Addition

If scraping fails or you need specific products, you can manually add them:

```javascript
// scripts/add-manual-equipment.js
const manualProducts = [
  {
    brand: "TaylorMade",
    model: "Stealth 2 Plus",
    category: "driver",
    msrp: 599.99,
    specifications: {
      year: 2023,
      loft_options: ["8°", "9°", "10.5°"]
    }
  }
];
// Import to Supabase...
```

## Legal Note
Always check the website's Terms of Service and robots.txt before scraping. This tool is for educational purposes and personal use only.