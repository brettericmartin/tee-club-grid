export interface EquipmentSpecs {
  shaft?: {
    brand: string;
    model: string;
    flex: string;
    weight?: string;
    price?: number;
    imageUrl?: string;
    isStock: boolean;
  };
  grip?: {
    brand: string;
    model: string;
    size: 'Standard' | 'Midsize' | 'Jumbo';
    imageUrl?: string;
    isStock: boolean;
  };
}

export interface Equipment {
  id: string;
  brand: string;
  model: string;
  category: 'driver' | 'wood' | 'hybrid' | 'iron' | 'wedge' | 'putter' | 'ball' | 'glove' | 'rangefinder' | 'bag';
  image: string; // Changed from imageUrl to image to match database
  msrp: number; // Added msrp property
  customSpecs?: string; // "9.5° Ventus Black 6X"
  specs?: EquipmentSpecs; // Detailed shaft and grip specifications
}

export interface BagItem {
  equipment: Equipment;
  isFeatured: boolean; // User can star 4-6 items for their feed card
  purchaseDate?: string;
  customNotes?: string;
}

export interface UserBag {
  id: string;
  userId: string;
  name: string;
  items: BagItem[];
  totalValue: number;
  featuredLayout: 'grid' | 'hero' | 'minimal'; // How featured items display
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  handicap: number;
  location?: string;
  avgScore?: number;
  roundsPlayed?: number;
  avatar?: string;
  bagBackground?: 'midwest-lush' | 'desert' | 'ocean' | 'mountain';
}