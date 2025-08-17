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
        imageUrl={equipment.image_url}
      />

      {/* Technical Specifications */}
      <Card className="bg-[#1a1a1a] border-white/10 p-6">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Technical Specifications
        </h3>
        <TechnicalSpecsGrid 
          category={category}
          specs={specs}
        />
      </Card>

      {/* Key Features (if available) */}
      {keyFeatures.length > 0 && (
        <Card className="bg-[#1a1a1a] border-white/10 p-6">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Key Features
          </h3>
          <KeyFeaturesList features={keyFeatures} />
        </Card>
      )}

      {/* Tour Usage (if available) */}
      {tourUsage.length > 0 && (
        <Card className="bg-[#1a1a1a] border-white/10 p-6">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Tour Usage
          </h3>
          <TourUsageSection players={tourUsage} />
        </Card>
      )}

      {/* Additional Info */}
      {(specs.technology || specs.material || specs.adjustability) && (
        <Card className="bg-[#2a2a2a] border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Additional Information</h3>
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