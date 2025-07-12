import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Grip, Shuffle, Save, Eye, Wrench, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EQUIPMENT_CATEGORIES } from '@/lib/equipment-categories';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'];
type BagEquipment = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Equipment;
  custom_photo_url?: string;
  shaft?: Database['public']['Tables']['shafts']['Row'];
  grip?: Database['public']['Tables']['grips']['Row'];
};

interface LayoutItem {
  position: number;
  size: number;
  x?: number;
  y?: number;
}

interface BagGalleryProps {
  bagEquipment: BagEquipment[];
  layout?: Record<string, LayoutItem>;
  isEditing?: boolean;
  isOwnBag?: boolean;
  onLayoutChange?: (layout: Record<string, LayoutItem>) => void;
  onSaveLayout?: () => void;
  onEquipmentClick?: (item: BagEquipment) => void;
}

// Equipment size multipliers based on category
const EQUIPMENT_SIZES: Record<string, number> = {
  drivers: 1.5,
  putters: 1.5,
  woods: 1.25,
  hybrids: 1.25,
  iron_sets: 1.25,
  wedges: 1.0,
  balls: 1.0,
  bags: 1.0,
  gloves: 1.0,
  rangefinders: 1.0,
  accessories: 1.0,
};

export function BagGallery({
  bagEquipment,
  layout = {},
  isEditing = false,
  isOwnBag = false,
  onLayoutChange,
  onSaveLayout,
  onEquipmentClick,
}: BagGalleryProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<BagEquipment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize items with layout positions
  useEffect(() => {
    const sortedItems = [...bagEquipment].sort((a, b) => {
      const layoutA = layout[a.equipment_id] || { position: 999 };
      const layoutB = layout[b.equipment_id] || { position: 999 };
      return layoutA.position - layoutB.position;
    });
    setItems(sortedItems);
  }, [bagEquipment, layout]);

  const handleDragStart = () => {
    setIsDragging(true);
    // Add haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);

    if (!result.destination || !onLayoutChange) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);

    // Update layout with new positions
    const newLayout: Record<string, LayoutItem> = {};
    newItems.forEach((item, index) => {
      const size = EQUIPMENT_SIZES[item.equipment.category] || 1.0;
      newLayout[item.equipment_id] = {
        position: index,
        size: size,
        ...(layout[item.equipment_id] || {}),
      };
    });

    onLayoutChange(newLayout);
  };

  const handleAutoArrange = useCallback(() => {
    if (!onLayoutChange) return;

    // Group equipment by category for optimal arrangement
    const grouped = items.reduce((acc, item) => {
      const category = item.equipment.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, BagEquipment[]>);

    // Arrange in priority order: drivers, woods, hybrids, irons, wedges, putters, accessories
    const categoryOrder = [
      'drivers', 'woods', 'hybrids', 'iron_sets', 
      'wedges', 'putters', 'balls', 'bags', 
      'gloves', 'rangefinders', 'accessories'
    ];

    const arranged: BagEquipment[] = [];
    categoryOrder.forEach(category => {
      if (grouped[category]) {
        arranged.push(...grouped[category]);
      }
    });

    // Add any remaining categories
    Object.keys(grouped).forEach(category => {
      if (!categoryOrder.includes(category)) {
        arranged.push(...grouped[category]);
      }
    });

    setItems(arranged);

    // Create optimized layout
    const newLayout: Record<string, LayoutItem> = {};
    arranged.forEach((item, index) => {
      const size = EQUIPMENT_SIZES[item.equipment.category] || 1.0;
      newLayout[item.equipment_id] = {
        position: index,
        size: size,
      };
    });

    onLayoutChange(newLayout);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 20, 10]);
    }
  }, [items, onLayoutChange]);

  const getItemSize = (item: BagEquipment) => {
    const layoutItem = layout[item.equipment_id];
    return layoutItem?.size || EQUIPMENT_SIZES[item.equipment.category] || 1.0;
  };

  const getGridClass = (size: number) => {
    if (size >= 1.5) return 'col-span-2 row-span-2';
    if (size >= 1.25) return 'col-span-2 row-span-1 md:col-span-1 md:row-span-2';
    return 'col-span-1 row-span-1';
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      {isEditing && (
        <div className="flex flex-wrap gap-2 p-4 bg-black/20 backdrop-blur-sm rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoArrange}
            className="gap-2"
          >
            <Shuffle className="h-4 w-4" />
            Auto Arrange
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Edit Mode' : 'Preview'}
          </Button>
          {onSaveLayout && (
            <Button
              variant="default"
              size="sm"
              onClick={onSaveLayout}
              className="gap-2 ml-auto"
            >
              <Save className="h-4 w-4" />
              Save Layout
            </Button>
          )}
        </div>
      )}

      {/* Gallery Grid */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Droppable droppableId="bag-gallery" isDropDisabled={!isEditing || showPreview}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4",
                "bg-gradient-to-b from-black/10 to-black/20 rounded-xl",
                "transition-colors duration-200",
                snapshot.isDraggingOver && "ring-2 ring-primary/50 bg-black/30"
              )}
            >
              {items.map((item, index) => {
                const size = getItemSize(item);
                const gridClass = getGridClass(size);

                return (
                  <Draggable
                    key={item.equipment_id}
                    draggableId={item.equipment_id}
                    index={index}
                    isDragDisabled={!isEditing || showPreview}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...(isEditing && !showPreview ? provided.dragHandleProps : {})}
                        className={cn(
                          gridClass,
                          "relative group transition-transform duration-300",
                          snapshot.isDragging && "z-50"
                        )}
                        style={{
                          ...provided.draggableProps.style,
                        }}
                      >
                        {/* Equipment Card */}
                        <div
                          className={cn(
                            "relative h-full min-h-[120px] rounded-lg overflow-hidden",
                            "bg-white/10 border border-white/20",
                            "transition-transform duration-200",
                            isEditing && !showPreview && "cursor-move",
                            !isEditing && "cursor-pointer hover:bg-white/[0.15]",
                            snapshot.isDragging && "shadow-2xl scale-105 opacity-90"
                          )}
                          onClick={() => {
                            if (!isEditing && !isDragging) {
                              if (onEquipmentClick) {
                                onEquipmentClick(item);
                              } else if (!isOwnBag) {
                                navigate(`/equipment/${item.equipment.id}`);
                              }
                            }
                          }}
                        >
                          {/* Drag Indicator */}
                          {isEditing && !showPreview && (
                            <div
                              className="absolute top-2 right-2 z-10 p-2 rounded-md bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Grip className="h-4 w-4 text-white" />
                            </div>
                          )}

                          {/* Equipment Image */}
                          <div className="relative h-full flex items-center justify-center p-4">
                            {item.custom_photo_url || item.equipment.image_url ? (
                              <img
                                src={item.custom_photo_url || item.equipment.image_url}
                                alt={`${item.equipment.brand} ${item.equipment.model}`}
                                className="w-full h-full object-contain"
                                draggable={false}
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 rounded-md flex items-center justify-center">
                                <span className="text-gray-400 text-xs text-center px-2">
                                  {item.equipment.brand}<br />
                                  {item.equipment.model}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Equipment Info Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">
                                  {item.equipment.brand}
                                </p>
                                <p className="text-white/70 text-xs truncate">
                                  {item.equipment.model}
                                </p>
                              </div>
                              {/* Custom Setup Indicators */}
                              {(item.shaft || item.grip || item.custom_photo_url) && (
                                <div className="flex gap-1 ml-2">
                                  {(item.shaft || item.grip) && (
                                    <div className="p-1 bg-primary/20 rounded" title="Custom Setup">
                                      <Wrench className="h-3 w-3 text-primary" />
                                    </div>
                                  )}
                                  {item.custom_photo_url && (
                                    <div className="p-1 bg-primary/20 rounded" title="Custom Photo">
                                      <Settings2 className="h-3 w-3 text-primary" />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Mobile Instructions */}
      {isEditing && !showPreview && (
        <p className="text-center text-sm text-muted-foreground px-4">
          <Grip className="inline h-4 w-4 mr-1" />
          Press and hold equipment to drag and rearrange
        </p>
      )}
    </div>
  );
}