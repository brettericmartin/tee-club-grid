export interface ShaftOption {
  id: string;
  brand: string;
  model: string;
  flex: string;
  weight: string;
  price: number;
  imageUrl: string;
  isStock: boolean;
}

export interface GripOption {
  id: string;
  brand: string;
  model: string;
  size: 'Standard' | 'Midsize' | 'Jumbo';
  price: number;
  imageUrl: string;
  isStock: boolean;
}

export interface EquipmentDetail {
  id: string;
  brand: string;
  model: string;
  category: string;
  specs: {
    loft?: string;
    lie?: string;
    length?: string;
    headSize?: string;
    material?: string;
  };
  msrp: number;
  description: string;
  features: string[];
  images: string[];
  popularShafts: ShaftOption[];
  popularGrips: GripOption[];
  currentBuild: {
    shaft: ShaftOption;
    grip: GripOption;
    totalPrice: number;
  };
  isFeatured: boolean;
}