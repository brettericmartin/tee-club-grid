// Example Node.js/Express backend API for scraping equipment images
// This should be deployed as a separate service to handle CORS and scraping

const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());

// Enable CORS for your frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8081',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Scraping sources configuration
const SOURCES = {
  MANUFACTURER_SITES: [
    {
      name: 'TaylorMade',
      searchUrl: (query) => `https://www.taylormadegolf.com/search?q=${encodeURIComponent(query)}`,
      imageSelectors: ['.product-image img', '.gallery-image img', '.pdp-image img'],
      processUrl: (url, baseUrl) => url.startsWith('http') ? url : `${baseUrl}${url}`
    },
    {
      name: 'Titleist',
      searchUrl: (query) => `https://www.titleist.com/search?q=${encodeURIComponent(query)}`,
      imageSelectors: ['.product-image img', '.product-gallery img'],
      processUrl: (url) => url
    },
    {
      name: 'Callaway',
      searchUrl: (query) => `https://www.callawaygolf.com/search?q=${encodeURIComponent(query)}`,
      imageSelectors: ['.product-photo img', '.product-image-main img'],
      processUrl: (url) => url
    }
  ],
  RETAILER_SITES: [
    {
      name: 'Golf Galaxy',
      searchUrl: (query) => `https://www.golfgalaxy.com/search?searchTerm=${encodeURIComponent(query)}`,
      imageSelectors: ['.product-image img', '.ProductImage img'],
      processUrl: (url) => url
    },
    {
      name: '2nd Swing',
      searchUrl: (query) => `https://www.2ndswing.com/search/?q=${encodeURIComponent(query)}`,
      imageSelectors: ['.product-image img', '.gallery-image img'],
      processUrl: (url) => url
    }
  ],
  REVIEW_SITES: [
    {
      name: 'MyGolfSpy',
      searchUrl: (query) => `https://mygolfspy.com/?s=${encodeURIComponent(query)}`,
      imageSelectors: ['.wp-post-image', '.entry-content img'],
      processUrl: (url) => url
    }
  ]
};

// Main scraping endpoint
app.post('/api/scrape-equipment-images', async (req, res) => {
  const { brand, model, sources = ['MANUFACTURER_SITES'] } = req.body;
  const query = `${brand} ${model}`;
  const allImages = [];

  try {
    // Use Puppeteer for JavaScript-heavy sites
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (const sourceType of sources) {
      const sitesToScrape = SOURCES[sourceType] || [];
      
      for (const site of sitesToScrape) {
        try {
          const images = await scrapeSite(browser, site, query);
          allImages.push(...images);
        } catch (error) {
          console.error(`Error scraping ${site.name}:`, error);
        }
      }
    }

    await browser.close();

    // Remove duplicates and process images
    const uniqueImages = removeDuplicates(allImages);
    const processedImages = await validateImages(uniqueImages);

    res.json({
      success: true,
      images: processedImages,
      count: processedImages.length
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Scrape a single site
async function scrapeSite(browser, site, query) {
  const page = await browser.newPage();
  const images = [];

  try {
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Navigate to search page
    const url = site.searchUrl(query);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for images to load
    await page.waitForSelector('img', { timeout: 5000 }).catch(() => {});

    // Extract images using multiple selectors
    for (const selector of site.imageSelectors) {
      const extractedImages = await page.evaluate((sel, siteName) => {
        const imgs = document.querySelectorAll(sel);
        return Array.from(imgs).map(img => ({
          url: img.src || img.dataset.src || img.getAttribute('data-lazy-src'),
          alt: img.alt,
          title: img.title,
          width: img.naturalWidth,
          height: img.naturalHeight,
          source: siteName
        }));
      }, selector, site.name);

      images.push(...extractedImages);
    }

    // Process URLs
    const baseUrl = new URL(url).origin;
    const processedImages = images.map(img => ({
      ...img,
      url: site.processUrl(img.url, baseUrl)
    }));

    return processedImages.filter(img => img.url && isValidImageUrl(img.url));

  } catch (error) {
    console.error(`Error scraping ${site.name}:`, error);
    return [];
  } finally {
    await page.close();
  }
}

// Alternative: Use Cheerio for simple HTML scraping (faster)
app.post('/api/scrape-equipment-images-simple', async (req, res) => {
  const { brand, model, url } = req.body;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const images = [];

    // Find all images
    $('img').each((i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      const alt = $(elem).attr('alt') || '';
      
      if (src && (alt.toLowerCase().includes(brand.toLowerCase()) || 
                  alt.toLowerCase().includes(model.toLowerCase()))) {
        images.push({
          url: new URL(src, url).href,
          alt: alt,
          source: new URL(url).hostname
        });
      }
    });

    res.json({ success: true, images });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions
function isValidImageUrl(url) {
  try {
    const parsed = new URL(url);
    const ext = parsed.pathname.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
  } catch {
    return false;
  }
}

function removeDuplicates(images) {
  const seen = new Set();
  return images.filter(img => {
    if (seen.has(img.url)) return false;
    seen.add(img.url);
    return true;
  });
}

async function validateImages(images) {
  // Filter out small images (likely icons/thumbnails)
  return images.filter(img => {
    if (img.width && img.height) {
      return img.width > 200 && img.height > 200;
    }
    // Keep images without dimensions (will be checked client-side)
    return true;
  });
}

// Google Custom Search API integration
app.post('/api/search-google-images', async (req, res) => {
  const { brand, model } = req.body;
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Google Search API not configured' 
    });
  }

  try {
    const query = `${brand} ${model} golf equipment`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&searchType=image&num=10`;
    
    const response = await axios.get(url);
    const images = response.data.items.map(item => ({
      url: item.link,
      title: item.title,
      alt: item.snippet,
      source: 'Google Images',
      width: item.image?.width,
      height: item.image?.height,
      thumbnailUrl: item.image?.thumbnailLink
    }));

    res.json({ success: true, images });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Scraping API running on port ${PORT}`);
});

// Deployment notes:
// 1. Deploy this as a separate service (Heroku, Railway, Render, etc.)
// 2. Set environment variables:
//    - FRONTEND_URL (your React app URL)
//    - GOOGLE_SEARCH_API_KEY (optional)
//    - GOOGLE_SEARCH_ENGINE_ID (optional)
// 3. Update your React app to use the deployed API URL
// 4. Consider adding rate limiting and caching