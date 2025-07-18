import { FC, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import FilterModal from './FilterModal';
import { EQUIPMENT_CATEGORIES, CATEGORY_DISPLAY_NAMES } from '@/lib/equipment-categories';
import { useCategoryImages } from '@/hooks/useCategoryImages';
import { Check } from 'lucide-react';

interface CategoryFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  onSelect: (category: string) => void;
}

// Category tile component
const CategoryTile: FC<{
  category: { value: string; label: string; icon: string };
  isSelected: boolean;
  hasImage: boolean;
  imageUrl?: string;
  onClick: () => void;
}> = ({ category, isSelected, hasImage, imageUrl, onClick }) => {
  return (
    <Card
      className={cn(
        "glass-card p-6 cursor-pointer transition-colors duration-200 group relative",
        "hover:scale-[1.02] hover:bg-white/15",
        isSelected && "ring-2 ring-primary bg-primary/10"
      )}
      onClick={onClick}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-3 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
          {hasImage && imageUrl ? (
            <img 
              src={imageUrl}
              alt={category.label}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="text-3xl">{category.icon}</div>
          )}
        </div>
        <div className={cn(
          "font-medium transition-colors",
          isSelected ? "text-primary" : "text-white group-hover:text-primary"
        )}>
          {category.label}
        </div>
      </div>
    </Card>
  );
};

const CategoryFilterModal: FC<CategoryFilterModalProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  onSelect
}) => {
  const [localSelected, setLocalSelected] = useState(selectedCategory);
  
  // Get category images
  const categoryValues = EQUIPMENT_CATEGORIES.map(cat => cat.value);
  const { categoryImages } = useCategoryImages(categoryValues);

  useEffect(() => {
    setLocalSelected(selectedCategory);
  }, [selectedCategory]);

  const handleSelect = (value: string) => {
    setLocalSelected(value);
    onSelect(value);
    onClose();
  };

  // Create "All Categories" option
  const allCategoriesOption = {
    value: 'all',
    label: 'All Categories',
    icon: '🏌️'
  };

  const categories = [allCategoriesOption, ...EQUIPMENT_CATEGORIES];

  return (
    <FilterModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Category"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((category) => {
          const categoryImage = categoryImages[category.value];
          const hasImage = !!(categoryImage?.imageUrl);
          
          return (
            <CategoryTile
              key={category.value}
              category={category}
              isSelected={localSelected === category.value}
              hasImage={hasImage}
              imageUrl={categoryImage?.imageUrl}
              onClick={() => handleSelect(category.value)}
            />
          );
        })}
      </div>
    </FilterModal>
  );
};

export default CategoryFilterModal;