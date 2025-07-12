import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface CategoryImage {
  imageUrl: string | null;
  equipment: string;
  likesCount: number;
}

type CategoryImages = Record<string, CategoryImage>;

export function useCategoryImages(categories: string[]) {
  const [categoryImages, setCategoryImages] = useState<CategoryImages>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategoryImages();
  }, []);

  const loadCategoryImages = async () => {
    setLoading(true);
    const images: CategoryImages = {};

    console.log('🖼️ Loading category images for:', categories);

    for (const category of categories) {
      try {
        // First try to get the most liked photo for this category
        const { data: mostLikedPhoto, error: photoError } = await supabase
          .from('equipment_photos')
          .select(`
            photo_url,
            likes_count,
            equipment:equipment!inner(
              brand,
              model,
              category
            )
          `)
          .eq('equipment.category', category)
          .order('likes_count', { ascending: false })
          .limit(1);

        if (photoError) {
          console.error(`Error loading photos for ${category}:`, photoError);
        }

        if (mostLikedPhoto && mostLikedPhoto.length > 0) {
          const photo = mostLikedPhoto[0];
          images[category] = {
            imageUrl: photo.photo_url,
            equipment: `${photo.equipment.brand} ${photo.equipment.model}`,
            likesCount: photo.likes_count || 0
          };
          console.log(`✅ Found photo for ${category}: ${photo.equipment.brand} ${photo.equipment.model}`);
          continue;
        }

        // Fallback to any equipment with an image_url
        const { data: equipmentWithImage } = await supabase
          .from('equipment')
          .select('brand, model, image_url')
          .eq('category', category)
          .not('image_url', 'is', null)
          .limit(1);

        if (equipmentWithImage && equipmentWithImage.length > 0) {
          const equipment = equipmentWithImage[0];
          images[category] = {
            imageUrl: equipment.image_url,
            equipment: `${equipment.brand} ${equipment.model}`,
            likesCount: 0
          };
          continue;
        }

        // Final fallback - just get any equipment for this category
        const { data: anyEquipment } = await supabase
          .from('equipment')
          .select('brand, model')
          .eq('category', category)
          .limit(1);

        if (anyEquipment && anyEquipment.length > 0) {
          const equipment = anyEquipment[0];
          images[category] = {
            imageUrl: null,
            equipment: `${equipment.brand} ${equipment.model}`,
            likesCount: 0
          };
          console.log(`⚪ No photo for ${category}, showing: ${equipment.brand} ${equipment.model}`);
        }

      } catch (error) {
        console.error(`Error loading image for category ${category}:`, error);
        images[category] = {
          imageUrl: null,
          equipment: 'Unknown Equipment',
          likesCount: 0
        };
      }
    }

    console.log('🖼️ Final category images:', images);
    setCategoryImages(images);
    setLoading(false);
  };

  return { categoryImages, loading, refresh: loadCategoryImages };
}