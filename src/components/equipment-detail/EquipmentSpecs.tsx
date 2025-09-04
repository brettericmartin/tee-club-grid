import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SpecsOverview from './SpecsOverview';
import TechnicalSpecsGrid from './TechnicalSpecsGrid';
import KeyFeaturesList from './KeyFeaturesList';
import TourUsageSection from './TourUsageSection';
import { getEquipmentCategory } from '@/types/equipmentSpecs';

interface EquipmentSpecsProps {
  equipment: {
    id: string;
    brand: string;
    model: string;
    category: string;
    msrp?: number;
    release_date?: string;
    description?: string;
    specs?: Record<string, any>;
    image_url?: string;
  };
  loading?: boolean;
}

export default function EquipmentSpecs({ equipment, loading = false }: EquipmentSpecsProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-[#1a1a1a] border-white/10">
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-[#1a1a1a] border-white/10">
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
          <Card className="bg-[#1a1a1a] border-white/10">
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Extract specs from equipment data
  const specs = equipment.specs || {};
  const category = getEquipmentCategory(equipment.category);
  
  // Extract tour usage and key features from specs
  const tourUsage = specs.tour_usage || [];
  const keyFeatures = specs.key_features || [];

  // Prepare universal specs
  const universalSpecs = {
    brand: equipment.brand,
    model: equipment.model,
    category: equipment.category,
    msrp: equipment.msrp,
    release_year: equipment.release_date ? new Date(equipment.release_date).getFullYear() : specs.release_year,
    description: equipment.description || specs.description,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview Section */}
      <SpecsOverview 
        specs={{ ...universalSpecs, ...specs }}
      />

      {/* Technical Specifications - Only show if we have specs */}
      {Object.keys(specs).length > 0 && (
        <Card className="bg-[#1a1a1a] border-white/10 p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">
            Technical Specifications
          </h3>
          <TechnicalSpecsGrid 
            category={category}
            specs={specs}
          />
        </Card>
      )}

      {/* Key Features (if available) */}
      {keyFeatures.length > 0 && (
        <Card className="bg-[#1a1a1a] border-white/10 p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">
            Key Features
          </h3>
          <KeyFeaturesList features={keyFeatures} />
        </Card>
      )}

      {/* Tour Usage (if available) */}
      {tourUsage.length > 0 && (
        <Card className="bg-[#1a1a1a] border-white/10 p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">
            Tour Usage
          </h3>
          <TourUsageSection players={tourUsage} />
        </Card>
      )}

      {/* Additional Info */}
      {(specs.technology || specs.material || specs.adjustability) && (
        <Card className="bg-[#2a2a2a] border-white/10 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Additional Information</h3>
          <div className="space-y-3 text-white/80">
            {specs.technology && (
              <div>
                <span className="font-medium text-white">Technology:</span> {specs.technology}
              </div>
            )}
            {specs.material && (
              <div>
                <span className="font-medium text-white">Material:</span> {specs.material}
              </div>
            )}
            {specs.adjustability && (
              <div>
                <span className="font-medium text-white">Adjustability:</span> {specs.adjustability}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}