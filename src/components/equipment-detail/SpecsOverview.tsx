import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, Info } from 'lucide-react';

interface SpecsOverviewProps {
  specs: {
    brand: string;
    model: string;
    category: string;
    msrp?: number;
    release_year?: number;
    description?: string;
  };
}

export default function SpecsOverview({ specs }: SpecsOverviewProps) {
  // Only show the overview card if we have meaningful data
  const hasData = specs.msrp || specs.release_year || specs.description;
  
  if (!hasData) return null;
  
  return (
    <Card className="bg-[#1a1a1a] border-white/10 p-4 sm:p-6">
      <div className="space-y-4">
          {/* Quick Stats - Mobile optimized */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {specs.msrp && (
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#2a2a2a]">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-white/60">MSRP</p>
                  <p className="text-lg font-semibold text-white">
                    ${specs.msrp.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {specs.release_year && (
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#2a2a2a]">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-white/60">Release Year</p>
                  <p className="text-lg font-semibold text-white">
                    {specs.release_year}
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Description */}
          {specs.description && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-white/80 leading-relaxed">
                {specs.description}
              </p>
            </div>
          )}
      </div>
    </Card>
  );
}