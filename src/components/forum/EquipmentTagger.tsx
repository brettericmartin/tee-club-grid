import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { useDebounce } from '@/hooks/useDebounce';

interface Equipment {
  id: string;
  brand: string;
  model: string;
  category: string;
  image_url?: string;
}

interface EquipmentTaggerProps {
  selectedEquipment: Equipment[];
  onEquipmentChange: (equipment: Equipment[]) => void;
  maxItems?: number;
}

export default function EquipmentTagger({ 
  selectedEquipment, 
  onEquipmentChange, 
  maxItems = 5 
}: EquipmentTaggerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Equipment[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedSearch.trim().length >= 2) {
      searchEquipment(debouncedSearch);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

  const searchEquipment = async (query: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('id, brand, model, category, image_url')
        .or(`brand.ilike.%${query}%,model.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      
      const filtered = data?.filter(item => 
        !selectedEquipment.some(selected => selected.id === item.id)
      ) || [];
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching equipment:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addEquipment = (equipment: Equipment) => {
    if (selectedEquipment.length < maxItems) {
      onEquipmentChange([...selectedEquipment, equipment]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeEquipment = (equipmentId: string) => {
    onEquipmentChange(selectedEquipment.filter(item => item.id !== equipmentId));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search equipment to tag..."
          className="pl-10 bg-white/5 border-white/10"
          disabled={selectedEquipment.length >= maxItems}
        />
      </div>

      {searchResults.length > 0 && (
        <ScrollArea className="h-32 border border-white/10 rounded-lg">
          <div className="p-2 space-y-1">
            {searchResults.map((equipment) => (
              <Button
                key={equipment.id}
                variant="ghost"
                className="w-full justify-start h-auto p-2"
                onClick={() => addEquipment(equipment)}
              >
                <div className="flex items-center gap-2">
                  {equipment.image_url && (
                    <img 
                      src={equipment.image_url} 
                      alt={`${equipment.brand} ${equipment.model}`}
                      className="w-8 h-8 object-cover rounded"
                    />
                  )}
                  <div className="text-left">
                    <div className="font-medium text-sm">
                      {equipment.brand} {equipment.model}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">
                      {equipment.category.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      )}

      {selectedEquipment.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-400">
            Tagged Equipment ({selectedEquipment.length}/{maxItems})
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedEquipment.map((equipment) => (
              <Badge
                key={equipment.id}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <span className="text-xs">
                  {equipment.brand} {equipment.model}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-red-500/20"
                  onClick={() => removeEquipment(equipment.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
