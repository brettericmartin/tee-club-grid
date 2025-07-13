export interface Equipment {
  id: string;
  brand: string;
  model: string;
  category: 'driver' | 'wood' | 'hybrid' | 'iron' | 'wedge' | 'putter' | 'ball' | 'bag' | 'rangefinder' | 'glove';
  year: number;
  msrp: number;
  image: string;
  description?: string;
  specs?: any;
  isVerified: boolean;
  submittedBy?: string;
  releaseDate?: string;
  discontinued?: boolean;
}

export interface SubmitEquipmentForm {
  brand: string;
  model: string;
  year: number;
  category: string;
  description?: string;
  imageUrl?: string;
  isCustom?: boolean;
  imageFile?: File | null;
}

export interface EquipmentFilter {
  category?: string;
  brand?: string;
  year?: number;
  minPrice?: number;
  maxPrice?: number;
  verified?: boolean;
  search?: string;
}

export interface BagConfiguration {
  name: string;
  items: BagItem[];
  totalValue: number;
}

export interface BagItem {
  equipmentId: string;
  customSpecs?: string;
  shaft?: string;
  grip?: string;
  loft?: string;
  featured?: boolean;
}