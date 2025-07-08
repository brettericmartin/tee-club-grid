// Simplified scraper API that uses public APIs and mock data
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8081'
}));

// Mock equipment images database
const MOCK_IMAGES = {
  'taylormade': {
    'stealth 2 driver': [
      {
        url: 'https://www.taylormadegolf.com/dw/image/v2/BFWW_PRD/on/demandware.static/-/Sites-master-catalog/default/dw8e7a8f9f/images/large/TaylorMade_Stealth_2_Driver_Hero.jpg',
        source: 'TaylorMade',
        title: 'Stealth 2 Driver - Hero Shot',
        width: 800,
        height: 800
      },
      {
        url: 'https://www.taylormadegolf.com/dw/image/v2/BFWW_PRD/on/demandware.static/-/Sites-master-catalog/default/dw5f8a9f9f/images/large/TaylorMade_Stealth_2_Driver_Face.jpg',
        source: 'TaylorMade',
        title: 'Stealth 2 Driver - Face View',
        width: 800,
        height: 800
      }
    ],
    'sim2 driver': [
      {
        url: 'https://www.taylormadegolf.com/dw/image/v2/BFWW_PRD/on/demandware.static/-/Sites-master-catalog/default/dw123456/images/large/SIM2_Driver.jpg',
        source: 'TaylorMade',
        title: 'SIM2 Driver',
        width: 800,
        height: 800
      }
    ]
  },
  'titleist': {
    't100 irons': [
      {
        url: 'https://www.titleist.com/dw/image/v2/BFWW_PRD/on/demandware.static/-/Sites-master-catalog/default/dw789abc/images/T100_Irons.jpg',
        source: 'Titleist',
        title: 'T100 Irons Set',
        width: 800,
        height: 600
      }
    ],
    'pro v1': [
      {
        url: 'https://www.titleist.com/dw/image/v2/BFWW_PRD/on/demandware.static/-/Sites-master-catalog/default/dwdef123/images/ProV1_Ball.jpg',
        source: 'Titleist',
        title: 'Pro V1 Golf Ball',
        width: 600,
        height: 600
      }
    ]
  },
  'callaway': {
    'paradym driver': [
      {
        url: 'https://www.callawaygolf.com/dw/image/v2/paradym-driver-hero.jpg',
        source: 'Callaway',
        title: 'Paradym Driver',
        width: 800,
        height: 800
      }
    ]
  }
};

// Unsplash API for fallback images
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

app.post('/api/scrape-equipment-images', async (req, res) => {
  const { brand, model } = req.body;
  console.log(`Searching for: ${brand} ${model}`);

  const images = [];

  try {
    // 1. Check mock database first
    const brandLower = brand.toLowerCase();
    const modelLower = model.toLowerCase();
    
    if (MOCK_IMAGES[brandLower] && MOCK_IMAGES[brandLower][modelLower]) {
      images.push(...MOCK_IMAGES[brandLower][modelLower]);
    }

    // 2. Try Unsplash API (free tier)
    if (UNSPLASH_ACCESS_KEY) {
      try {
        const unsplashResponse = await axios.get(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(brand + ' ' + model + ' golf')}&per_page=5`,
          {
            headers: {
              'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
            }
          }
        );

        if (unsplashResponse.data.results) {
          images.push(...unsplashResponse.data.results.map(photo => ({
            url: photo.urls.regular,
            source: 'Unsplash',
            title: photo.description || `${brand} ${model}`,
            width: photo.width,
            height: photo.height,
            alt: photo.alt_description
          })));
        }
      } catch (error) {
        console.error('Unsplash API error:', error.message);
      }
    }

    // 3. Add some generic golf equipment images as fallback
    if (images.length === 0) {
      images.push(
        {
          url: `https://source.unsplash.com/800x600/?golf,${brand},equipment`,
          source: 'Stock Photo',
          title: `${brand} ${model} - Stock Image`,
          width: 800,
          height: 600
        },
        {
          url: `https://picsum.photos/seed/${brand}-${model}/800/600`,
          source: 'Placeholder',
          title: `${brand} ${model} - Placeholder`,
          width: 800,
          height: 600
        }
      );
    }

    res.json({
      success: true,
      images: images,
      count: images.length
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      images: []
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Equipment database endpoint (mock data)
app.get('/api/equipment-database', (req, res) => {
  const database = [];
  
  for (const [brand, models] of Object.entries(MOCK_IMAGES)) {
    for (const [model, images] of Object.entries(models)) {
      database.push({
        brand: brand.charAt(0).toUpperCase() + brand.slice(1),
        model: model.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        imageCount: images.length
      });
    }
  }
  
  res.json({ equipment: database });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Simple scraper API running on port ${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8081'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});