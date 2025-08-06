import { useState, useEffect } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'];

interface EquipmentTaggerProps {
  selectedEquipment: Equipment[];
  onEquipmentChange: (equipment: Equipment[]) => void;
  maxSelections?: number;
}

export default function EquipmentTagger({ 
  selectedEquipment, 
  onEquipmentChange,
  maxSelections = 5 
}: EquipmentTaggerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Equipment[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const searchEquipment = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('equipment')
          .select('*')
          .or(`brand.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`)
          .order('popularity_score', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        // Filter out already selected equipment
        const filteredResults = data?.filter(
          item => !selectedEquipment.find(selected => selected.id === item.id)
        ) || [];
        
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Error searching equipment:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchEquipment, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedEquipment]);

  const handleAddEquipment = (equipment: Equipment) => {
    if (selectedEquipment.length >= maxSelections) {
      return;
    }
    
    onEquipmentChange([...selectedEquipment, equipment]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const handleRemoveEquipment = (equipmentId: string) => {
    onEquipmentChange(selectedEquipment.filter(e => e.id !== equipmentId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Tag Equipment</label>
        <span className="text-xs text-gray-400">
          {selectedEquipment.length}/{maxSelections} selected
        </span>
      </div>

      {/* Selected Equipment */}
      {selectedEquipment.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEquipment.map((equipment) => (
            <Badge
              key={equipment.id}
              variant="secondary"
              className="bg-green-500/20 text-green-400 border-green-500/30"
            >
              <span className="text-xs">
                {equipment.brand} {equipment.model}
              </span>
              <button
                onClick={() => handleRemoveEquipment(equipment.id)}
                className="ml-2 hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add Equipment Button / Search */}
      {!showSearch && selectedEquipment.length < maxSelections && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowSearch(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tag Equipment
        </Button>
      )}

      {/* Search Interface */}
      {showSearch && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search equipment by brand or model..."
              className="pl-10 bg-white/5 border-white/10"
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2"
            >
              Cancel
            </Button>
          </div>

          {/* Search Results */}
          {searchQuery && (
            <ScrollArea className="h-40 rounded-md border border-white/10 bg-white/5">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-gray-400">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="p-2 space-y-1">
                  {searchResults.map((equipment) => (
                    <button
                      key={equipment.id}
                      onClick={() => handleAddEquipment(equipment)}
                      className="w-full p-2 text-left hover:bg-white/10 rounded transition-colors flex items-center gap-3"
                    >
                      {equipment.image_url && (
                        <img
                          src={equipment.image_url}
                          alt={`${equipment.brand} ${equipment.model}`}
                          className="w-8 h-8 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {equipment.brand} {equipment.model}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {equipment.category.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-400">
                  No equipment found
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Tag equipment mentioned in your post to help others discover related discussions
      </p>
    </div>
  );
}