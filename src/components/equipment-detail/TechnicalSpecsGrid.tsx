import React from 'react';
import { 
  Ruler, 
  Activity, 
  Settings, 
  Package, 
  Zap,
  Target,
  Wind,
  Layers,
  Shield,
  Gauge
} from 'lucide-react';

interface TechnicalSpecsGridProps {
  category: string;
  specs: Record<string, any>;
}

interface SpecItem {
  label: string;
  value: string | string[] | undefined;
  icon?: React.ReactNode;
}

export default function TechnicalSpecsGrid({ category, specs }: TechnicalSpecsGridProps) {
  // Define spec mappings for each category
  const getSpecsForCategory = (): SpecItem[] => {
    switch (category) {
      case 'driver':
        return [
          { 
            label: 'Loft Options', 
            value: specs.loft_options?.join(', '), 
            icon: <Target className="w-4 h-4" /> 
          },
          { 
            label: 'Shaft Flexibility', 
            value: specs.shaft_flex?.join(', '), 
            icon: <Activity className="w-4 h-4" /> 
          },
          { 
            label: 'Head Size', 
            value: specs.head_size, 
            icon: <Ruler className="w-4 h-4" /> 
          },
          { 
            label: 'Adjustability', 
            value: specs.adjustability, 
            icon: <Settings className="w-4 h-4" /> 
          },
          { 
            label: 'Face Technology', 
            value: specs.face_technology, 
            icon: <Zap className="w-4 h-4" /> 
          },
          { 
            label: 'Crown Material', 
            value: specs.crown_material, 
            icon: <Layers className="w-4 h-4" /> 
          },
          { 
            label: 'Stock Shaft', 
            value: specs.stock_shaft, 
            icon: <Package className="w-4 h-4" /> 
          },
          { 
            label: 'Launch', 
            value: specs.launch, 
            icon: <Wind className="w-4 h-4" /> 
          },
          { 
            label: 'Spin', 
            value: specs.spin, 
            icon: <Activity className="w-4 h-4" /> 
          },
          { 
            label: 'Forgiveness', 
            value: specs.forgiveness, 
            icon: <Shield className="w-4 h-4" /> 
          },
        ];

      case 'iron':
        return [
          { 
            label: 'Set Composition', 
            value: specs.set_composition, 
            icon: <Package className="w-4 h-4" /> 
          },
          { 
            label: 'Shaft Options', 
            value: specs.shaft_options?.join(', '), 
            icon: <Activity className="w-4 h-4" /> 
          },
          { 
            label: 'Material', 
            value: specs.material, 
            icon: <Layers className="w-4 h-4" /> 
          },
          { 
            label: 'Technology', 
            value: specs.technology, 
            icon: <Zap className="w-4 h-4" /> 
          },
          { 
            label: 'Offset', 
            value: specs.offset, 
            icon: <Settings className="w-4 h-4" /> 
          },
          { 
            label: 'Sole Width', 
            value: specs.sole_width, 
            icon: <Ruler className="w-4 h-4" /> 
          },
          { 
            label: 'Top Line', 
            value: specs.top_line, 
            icon: <Ruler className="w-4 h-4" /> 
          },
          { 
            label: 'Finish', 
            value: specs.finish, 
            icon: <Shield className="w-4 h-4" /> 
          },
          { 
            label: 'Launch', 
            value: specs.launch, 
            icon: <Wind className="w-4 h-4" /> 
          },
          { 
            label: 'Forgiveness', 
            value: specs.forgiveness, 
            icon: <Shield className="w-4 h-4" /> 
          },
        ];

      case 'putter':
        return [
          { 
            label: 'Head Style', 
            value: specs.head_style, 
            icon: <Package className="w-4 h-4" /> 
          },
          { 
            label: 'Length Options', 
            value: specs.length_options?.join(', '), 
            icon: <Ruler className="w-4 h-4" /> 
          },
          { 
            label: 'Material', 
            value: specs.material, 
            icon: <Layers className="w-4 h-4" /> 
          },
          { 
            label: 'Face Insert', 
            value: specs.face_insert, 
            icon: <Zap className="w-4 h-4" /> 
          },
          { 
            label: 'Toe Hang', 
            value: specs.toe_hang, 
            icon: <Activity className="w-4 h-4" /> 
          },
          { 
            label: 'Balance', 
            value: specs.balance, 
            icon: <Target className="w-4 h-4" /> 
          },
          { 
            label: 'Grip', 
            value: specs.grip, 
            icon: <Package className="w-4 h-4" /> 
          },
          { 
            label: 'Neck Style', 
            value: specs.neck_style, 
            icon: <Settings className="w-4 h-4" /> 
          },
          { 
            label: 'Weight', 
            value: specs.weight, 
            icon: <Gauge className="w-4 h-4" /> 
          },
          { 
            label: 'Lie Angle', 
            value: specs.lie_angle, 
            icon: <Settings className="w-4 h-4" /> 
          },
        ];

      case 'wedge':
        return [
          { 
            label: 'Loft', 
            value: specs.loft, 
            icon: <Target className="w-4 h-4" /> 
          },
          { 
            label: 'Bounce', 
            value: specs.bounce, 
            icon: <Activity className="w-4 h-4" /> 
          },
          { 
            label: 'Grind', 
            value: specs.grind, 
            icon: <Settings className="w-4 h-4" /> 
          },
          { 
            label: 'Material', 
            value: specs.material, 
            icon: <Layers className="w-4 h-4" /> 
          },
          { 
            label: 'Finish', 
            value: specs.finish, 
            icon: <Shield className="w-4 h-4" /> 
          },
          { 
            label: 'Grooves', 
            value: specs.grooves, 
            icon: <Zap className="w-4 h-4" /> 
          },
          { 
            label: 'Shaft Options', 
            value: specs.shaft_options?.join(', '), 
            icon: <Package className="w-4 h-4" /> 
          },
          { 
            label: 'Sole Width', 
            value: specs.sole_width, 
            icon: <Ruler className="w-4 h-4" /> 
          },
          { 
            label: 'Leading Edge', 
            value: specs.leading_edge, 
            icon: <Settings className="w-4 h-4" /> 
          },
          { 
            label: 'Lie Angle', 
            value: specs.lie_angle, 
            icon: <Gauge className="w-4 h-4" /> 
          },
        ];

      case 'ball':
        return [
          { 
            label: 'Construction', 
            value: specs.construction, 
            icon: <Layers className="w-4 h-4" /> 
          },
          { 
            label: 'Compression', 
            value: specs.compression, 
            icon: <Gauge className="w-4 h-4" /> 
          },
          { 
            label: 'Cover Material', 
            value: specs.cover_material, 
            icon: <Shield className="w-4 h-4" /> 
          },
          { 
            label: 'Dimple Count', 
            value: specs.dimple_count, 
            icon: <Target className="w-4 h-4" /> 
          },
          { 
            label: 'Feel', 
            value: specs.feel, 
            icon: <Activity className="w-4 h-4" /> 
          },
          { 
            label: 'Spin', 
            value: specs.spin, 
            icon: <Wind className="w-4 h-4" /> 
          },
          { 
            label: 'Launch', 
            value: specs.launch, 
            icon: <Wind className="w-4 h-4" /> 
          },
          { 
            label: 'Distance', 
            value: specs.distance, 
            icon: <Zap className="w-4 h-4" /> 
          },
        ];

      default:
        // Generic specs for unknown categories
        const genericSpecs: SpecItem[] = [];
        const commonFields = [
          'material', 'technology', 'weight', 'size', 'length', 
          'flex', 'shaft', 'grip', 'finish', 'adjustability'
        ];
        
        commonFields.forEach(field => {
          if (specs[field]) {
            genericSpecs.push({
              label: field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '),
              value: specs[field],
              icon: <Settings className="w-4 h-4" />
            });
          }
        });
        
        return genericSpecs;
    }
  };

  const categorySpecs = getSpecsForCategory().filter(spec => spec.value);

  if (categorySpecs.length === 0) {
    return (
      <div className="text-center py-8 text-white/50">
        No technical specifications available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {categorySpecs.map((spec, index) => (
        <div 
          key={index} 
          className="flex items-start gap-2 p-3 rounded-lg bg-[#2a2a2a]/50"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/60 mb-1">{spec.label}</p>
            <p className="text-sm text-white font-medium break-words">
              {Array.isArray(spec.value) ? spec.value.join(', ') : spec.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}