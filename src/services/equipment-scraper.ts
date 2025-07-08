// Equipment photo scraping service
// This would ideally run on a backend to avoid CORS issues

export interface ScrapedImage {
  url: string;
  source: string;
  title?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export const EQUIPMENT_IMAGE_SOURCES = {
  // Manufacturer sites
  TAYLORMADE: {
    name: 'TaylorMade',
    baseUrl: 'https://www.taylormadegolf.com',
    searchPattern: '/search?q=',
    imageSelector: '.product-image img, .gallery-image img'
  },
  TITLEIST: {
    name: 'Titleist',
    baseUrl: 'https://www.titleist.com',
    searchPattern: '/golf-clubs/',
    imageSelector: '.product-image img, .product-gallery img'
  },
  CALLAWAY: {
    name: 'Callaway',
    baseUrl: 'https://www.callawaygolf.com',
    searchPattern: '/search?q=',
    imageSelector: '.product-photo img, .product-image-main img'
  },
  PING: {
    name: 'Ping',
    baseUrl: 'https://ping.com',
    searchPattern: '/search/',
    imageSelector: '.product-image img'
  },
  
  // Retailer sites
  GOLF_GALAXY: {
    name: 'Golf Galaxy',
    baseUrl: 'https://www.golfgalaxy.com',
    searchPattern: '/search?searchTerm=',
    imageSelector: '.product-image img'
  },
  TGW: {
    name: 'The Golf Warehouse',
    baseUrl: 'https://www.tgw.com',
    searchPattern: '/search?q=',
    imageSelector: '.product-image img, .zoom-image img'
  },
  SECOND_SWING: {
    name: '2nd Swing Golf',
    baseUrl: 'https://www.2ndswing.com',
    searchPattern: '/search/?q=',
    imageSelector: '.product-image img, .gallery-image img'
  },
  
  // Review sites
  MYGOLFSPY: {
    name: 'MyGolfSpy',
    baseUrl: 'https://mygolfspy.com',
    searchPattern: '/?s=',
    imageSelector: '.wp-post-image, .entry-content img'
  },
  GOLF_DIGEST: {
    name: 'Golf Digest',
    baseUrl: 'https://www.golfdigest.com',
    searchPattern: '/search?q=',
    imageSelector: '.image img, article img'
  },
  GOLF_WRX: {
    name: 'GolfWRX',
    baseUrl: 'https://www.golfwrx.com',
    searchPattern: '/?s=',
    imageSelector: '.attachment-img, .wp-post-image'
  }
};

// Client-side function to call your scraping API
export async function scrapeEquipmentImages(
  brand: string,
  model: string,
  sources: string[] = ['TAYLORMADE', 'TITLEIST', 'GOLF_GALAXY']
): Promise<ScrapedImage[]> {
  try {
    // Call your backend API that does the actual scraping
    const apiUrl = import.meta.env.VITE_SCRAPER_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/scrape-equipment-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brand,
        model,
        sources
      })
    });

    if (!response.ok) {
      throw new Error('Scraping failed');
    }

    const data = await response.json();
    return data.images;
  } catch (error) {
    console.error('Error scraping images:', error);
    // Fallback to direct API calls if available
    return fallbackImageSearch(brand, model);
  }
}

// Fallback: Use public APIs or direct image searches
async function fallbackImageSearch(brand: string, model: string): Promise<ScrapedImage[]> {
  const images: ScrapedImage[] = [];
  
  // Google Custom Search API (requires API key)
  if (import.meta.env.VITE_GOOGLE_SEARCH_API_KEY) {
    try {
      const query = `${brand} ${model} golf equipment`;
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${import.meta.env.VITE_GOOGLE_SEARCH_API_KEY}&cx=${import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&searchType=image&num=10`
      );
      
      if (response.ok) {
        const data = await response.json();
        images.push(...data.items.map((item: any) => ({
          url: item.link,
          source: 'Google Images',
          title: item.title,
          alt: item.snippet,
          width: item.image?.width,
          height: item.image?.height
        })));
      }
    } catch (error) {
      console.error('Google search failed:', error);
    }
  }
  
  // Bing Image Search API (requires API key)
  if (import.meta.env.VITE_BING_SEARCH_API_KEY) {
    try {
      const query = `${brand} ${model} golf equipment`;
      const response = await fetch(
        `https://api.bing.microsoft.com/v7.0/images/search?q=${encodeURIComponent(query)}&count=10`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': import.meta.env.VITE_BING_SEARCH_API_KEY
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        images.push(...data.value.map((item: any) => ({
          url: item.contentUrl,
          source: 'Bing Images',
          title: item.name,
          alt: item.name,
          width: item.width,
          height: item.height
        })));
      }
    } catch (error) {
      console.error('Bing search failed:', error);
    }
  }
  
  return images;
}

// Process and validate scraped images
export async function processScrapedImages(images: ScrapedImage[]): Promise<ScrapedImage[]> {
  // Filter out invalid images
  const validImages = images.filter(img => {
    // Check URL is valid
    try {
      new URL(img.url);
    } catch {
      return false;
    }
    
    // Filter out tiny images (likely icons)
    if (img.width && img.height) {
      return img.width > 200 && img.height > 200;
    }
    
    return true;
  });
  
  // Remove duplicates
  const uniqueImages = validImages.filter((img, index, self) =>
    index === self.findIndex((i) => i.url === img.url)
  );
  
  // Sort by quality indicators
  return uniqueImages.sort((a, b) => {
    // Prefer larger images
    const aSize = (a.width || 0) * (a.height || 0);
    const bSize = (b.width || 0) * (b.height || 0);
    
    // Prefer manufacturer sites
    const aIsManufacturer = ['TaylorMade', 'Titleist', 'Callaway', 'Ping'].includes(a.source);
    const bIsManufacturer = ['TaylorMade', 'Titleist', 'Callaway', 'Ping'].includes(b.source);
    
    if (aIsManufacturer && !bIsManufacturer) return -1;
    if (!aIsManufacturer && bIsManufacturer) return 1;
    
    return bSize - aSize;
  });
}

// Import scraped images to Supabase
export async function importScrapedImages(
  equipmentId: string,
  images: ScrapedImage[],
  userId: string
) {
  const { supabase } = await import('@/lib/supabase');
  const results = [];
  
  for (const image of images) {
    try {
      // Check if image already exists
      const { data: existing } = await supabase
        .from('equipment_photos')
        .select('id')
        .eq('equipment_id', equipmentId)
        .eq('photo_url', image.url)
        .single();
      
      if (!existing) {
        const { data, error } = await supabase
          .from('equipment_photos')
          .insert({
            equipment_id: equipmentId,
            user_id: userId,
            photo_url: image.url,
            caption: `${image.title || 'Equipment photo'} (via ${image.source})`,
            is_primary: false,
            metadata: {
              source: image.source,
              original_title: image.title,
              width: image.width,
              height: image.height,
              scraped_at: new Date().toISOString()
            }
          })
          .select()
          .single();
        
        if (error) throw error;
        results.push({ success: true, data });
      } else {
        results.push({ success: false, reason: 'duplicate' });
      }
    } catch (error) {
      results.push({ success: false, error });
    }
  }
  
  return results;
}

// Backend API endpoint example (Node.js/Express)
export const scrapingEndpointExample = `
// api/scrape-equipment-images.js
import puppeteer from 'puppeteer';
import { EQUIPMENT_IMAGE_SOURCES } from './sources';

export async function POST(req, res) {
  const { brand, model, sources } = req.body;
  const images = [];
  
  const browser = await puppeteer.launch();
  
  for (const sourceKey of sources) {
    const source = EQUIPMENT_IMAGE_SOURCES[sourceKey];
    if (!source) continue;
    
    try {
      const page = await browser.newPage();
      const searchUrl = \`\${source.baseUrl}\${source.searchPattern}\${encodeURIComponent(brand + ' ' + model)}\`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Wait for images to load
      await page.waitForSelector(source.imageSelector, { timeout: 5000 }).catch(() => {});
      
      // Extract image URLs
      const extractedImages = await page.evaluate((selector) => {
        const imgs = document.querySelectorAll(selector);
        return Array.from(imgs).map(img => ({
          url: img.src || img.dataset.src,
          alt: img.alt,
          width: img.naturalWidth,
          height: img.naturalHeight
        }));
      }, source.imageSelector);
      
      images.push(...extractedImages.map(img => ({
        ...img,
        source: source.name,
        title: img.alt
      })));
      
      await page.close();
    } catch (error) {
      console.error(\`Error scraping \${source.name}:\`, error);
    }
  }
  
  await browser.close();
  
  res.json({ images });
}
`;