import React from 'react';
import { CheckCircle } from 'lucide-react';

interface KeyFeaturesListProps {
  features: string[];
}

export default function KeyFeaturesList({ features }: KeyFeaturesListProps) {
  if (!features || features.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {features.map((feature, index) => (
        <div 
          key={index}
          className="flex items-start gap-3 p-3 rounded-lg bg-[#2a2a2a]/30 hover:bg-[#2a2a2a]/50 transition-all duration-200"
          style={{
            animationDelay: `${index * 50}ms`,
          }}
        >
          <div className="flex-shrink-0 mt-0.5">
            <CheckCircle className="w-5 h-5 text-primary" />
          </div>
          <p className="text-white/90 text-sm leading-relaxed">
            {feature}
          </p>
        </div>
      ))}
    </div>
  );
}