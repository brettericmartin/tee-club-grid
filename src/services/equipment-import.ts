import { supabase } from '@/lib/supabase';

// Popular golf equipment APIs and data sources
export const GOLF_APIS = {
  // Free/Public Options
  GOLF_DIGEST_SCRAPER: {
    name: 'Golf Digest Hot List',
    url: 'https://www.golfdigest.com/hot-list',
    type: 'scraper',
    free: true
  },
  
  // Paid APIs
  SWINGU: {
    name: 'SwingU/Versus',
    url: 'https://versus.com/api',
    requiresKey: true,
    pricing: 'Contact for pricing'
  },
  
  RAKUTEN: {
    name: 'Rakuten RapidAPI - Golf Equipment',
    url: 'https://rapidapi.com/collection/golf-apis',
    requiresKey: true,
    pricing: 'From $0-$50/month'
  },

  // Retail APIs (might require partnership)
  TGW: {
    name: 'The Golf Warehouse',
    url: 'https://www.tgw.com',
    type: 'retail',
    requiresPartnership: true
  },

  GOLF_GALAXY: {
    name: 'Golf Galaxy / Dick\'s Sporting Goods',
    url: 'https://golfgalaxy.com',
    type: 'retail',
    requiresPartnership: true
  }
};

// Import equipment from external API
export async function importEquipmentFromAPI(apiData: {
  brand: string;
  model: string;
  category: string;
  year?: number;
  msrp?: number;
  description?: string;
  specifications?: Record<string, any>;
  images?: string[];
}) {
  try {
    // Check if equipment already exists
    const { data: existing } = await supabase
      .from('equipment')
      .select('id')
      .eq('brand', apiData.brand)
      .eq('model', apiData.model)
      .single();

    if (existing) {
      // Update existing equipment
      const { data, error } = await supabase
        .from('equipment')
        .update({
          msrp: apiData.msrp,
          specs: apiData.specifications,
          release_date: apiData.year ? `${apiData.year}-01-01` : null
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { equipment: data, isNew: false };
    } else {
      // Create new equipment
      const { data, error } = await supabase
        .from('equipment')
        .insert({
          brand: apiData.brand,
          model: apiData.model,
          category: apiData.category,
          msrp: apiData.msrp,
          specs: apiData.specifications,
          release_date: apiData.year ? `${apiData.year}-01-01` : null,
          image_url: apiData.images?.[0] || '/placeholder.svg'
        })
        .select()
        .single();

      if (error) throw error;

      // Import additional images
      if (apiData.images && apiData.images.length > 1) {
        for (let i = 1; i < apiData.images.length; i++) {
          await addEquipmentPhotoFromUrl(data.id, apiData.images[i], i === 0);
        }
      }

      return { equipment: data, isNew: true };
    }
  } catch (error) {
    console.error('Error importing equipment:', error);
    throw error;
  }
}

// Add photo from URL (for API imports)
export async function addEquipmentPhotoFromUrl(
  equipmentId: string,
  imageUrl: string,
  isPrimary: boolean = false
) {
  const { data, error } = await supabase
    .from('equipment_photos')
    .insert({
      equipment_id: equipmentId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      photo_url: imageUrl,
      is_primary: isPrimary
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Fetch equipment data from RapidAPI (example)
export async function fetchFromRapidAPI(brand: string, model: string) {
  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY || '',
      'X-RapidAPI-Host': 'golf-equipment-api.p.rapidapi.com'
    }
  };

  try {
    const response = await fetch(
      `https://golf-equipment-api.p.rapidapi.com/equipment?brand=${brand}&model=${model}`,
      options
    );
    return await response.json();
  } catch (error) {
    console.error('RapidAPI error:', error);
    throw error;
  }
}

// Scrape equipment data (would need a backend/proxy to avoid CORS)
export async function scrapeEquipmentData(url: string) {
  // This would call your backend API that does the actual scraping
  const response = await fetch('/api/scrape-equipment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    throw new Error('Failed to scrape equipment data');
  }

  return response.json();
}

// Bulk import from CSV/JSON
export async function bulkImportEquipment(file: File) {
  const text = await file.text();
  let equipment = [];

  if (file.name.endsWith('.json')) {
    equipment = JSON.parse(text);
  } else if (file.name.endsWith('.csv')) {
    // Parse CSV
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const item: any = {};
      headers.forEach((header, index) => {
        item[header.trim()] = values[index]?.trim();
      });
      equipment.push(item);
    }
  }

  const results = [];
  for (const item of equipment) {
    try {
      const result = await importEquipmentFromAPI({
        brand: item.brand,
        model: item.model,
        category: item.category,
        year: parseInt(item.year) || undefined,
        msrp: parseFloat(item.msrp) || undefined,
        specifications: item.specifications || {}
      });
      results.push({ success: true, ...result });
    } catch (error) {
      results.push({ success: false, error, item });
    }
  }

  return results;
}

// Search multiple APIs and aggregate results
export async function searchAllSources(query: string) {
  const sources = [
    { name: 'Database', search: () => searchLocalDatabase(query) },
    { name: 'RapidAPI', search: () => searchRapidAPI(query) },
    // Add more sources as needed
  ];

  const results = await Promise.allSettled(
    sources.map(source => source.search())
  );

  return results.map((result, index) => ({
    source: sources[index].name,
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : [],
    error: result.status === 'rejected' ? result.reason : null
  }));
}

async function searchLocalDatabase(query: string) {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .or(`brand.ilike.%${query}%,model.ilike.%${query}%`)
    .limit(20);

  if (error) throw error;
  return data;
}

async function searchRapidAPI(query: string) {
  // Implement RapidAPI search
  return [];
}