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
  imageUrl?: string;
}

export default function SpecsOverview({ specs, imageUrl }: SpecsOverviewProps) {
  return (
    <Card className="bg-[#1a1a1a] border-white/10 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Image */}
        {imageUrl && (
          <div className="md:col-span-1">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-[#2a2a2a]">
              <img
                src={imageUrl}
                alt={`${specs.brand} ${specs.model}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'w-full h-full flex items-center justify-center';
                    const text = document.createElement('span');
                    text.className = 'text-white/50 text-2xl font-bold';
                    text.textContent = specs.brand.substring(0, 2).toUpperCase();
                    fallback.appendChild(text);
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Right: Info */}
        <div className={`${imageUrl ? 'md:col-span-2' : 'md:col-span-3'} space-y-4`}>
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white">
                {specs.brand} {specs.model}
              </h2>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                {specs.category}
              </Badge>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#2a2a2a]">
                <Info className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-white/60">Category</p>
                <p className="text-lg font-semibold text-white capitalize">
                  {specs.category}
                </p>
              </div>
            </div>
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
      </div>
    </Card>
  );
}