import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

interface BagGalleryDndKitProps {
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

// Sortable Item Component
function SortableItem({ 
  item, 
  isEditing, 
  isDragging,
  onEquipmentClick,
  isOwnBag,
  size
}: {
  item: BagEquipment;
  isEditing: boolean;
  isDragging: boolean;
  onEquipmentClick?: (item: BagEquipment) => void;
  isOwnBag: boolean;
  size: number;
}) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: itemIsDragging,
  } = useSortable({ id: item.equipment_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: itemIsDragging ? 0.5 : 1,
  };

  const getGridClass = (size: number) => {
    if (size >= 1.5) return 'col-span-2 row-span-2';
    if (size >= 1.25) return 'col-span-2 row-span-1 md:col-span-1 md:row-span-2';
    return 'col-span-1 row-span-1';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        getGridClass(size),
        "relative group transition-transform duration-200",
        itemIsDragging && "z-50"
      )}
    >
      {/* Equipment Card */}
      <div
        className={cn(
          "relative h-full min-h-[120px] rounded-lg overflow-hidden",
          "bg-white/10 border border-white/20",
          "transition-transform duration-200",
          isEditing && "cursor-move",
          !isEditing && "cursor-pointer hover:bg-white/[0.15] hover:scale-105",
          itemIsDragging && "opacity-0"
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
        {/* Drag Handle */}
        {isEditing && (
          <div
            {...attributes}
            {...listeners}
            className="absolute inset-0 z-10"
          >
            <div className="absolute top-2 right-2 p-2 rounded-md bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <Grip className="h-4 w-4 text-white" />
            </div>
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
  );
}

export function BagGalleryDndKit({
  bagEquipment,
  layout = {},
  isEditing = false,
  isOwnBag = false,
  onLayoutChange,
  onSaveLayout,
  onEquipmentClick,
}: BagGalleryDndKitProps) {
  const [items, setItems] = useState<BagEquipment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Configure sensors for both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize items with layout positions
  useEffect(() => {
    const sortedItems = [...bagEquipment].sort((a, b) => {
      const layoutA = layout[a.equipment_id] || { position: 999 };
      const layoutB = layout[b.equipment_id] || { position: 999 };
      return layoutA.position - layoutB.position;
    });
    setItems(sortedItems);
  }, [bagEquipment, layout]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    // Add haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.equipment_id === active.id);
        const newIndex = items.findIndex((item) => item.equipment_id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Update layout with new positions
        if (onLayoutChange) {
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
        }

        return newItems;
      });
    }

    setActiveId(null);
  };

  const handleAutoArrange = () => {
    if (!onLayoutChange) return;

    // Group equipment by category for optimal arrangement
    const grouped = items.reduce((acc, item) => {
      const category = item.equipment.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, BagEquipment[]>);

    // Arrange in priority order
    const categoryOrder = [
      'driver', 'fairway_wood', 'hybrid', 'iron', 
      'wedge', 'putter', 'ball', 'bag', 
      'glove', 'rangefinder', 'gps', 'accessories'
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
  };

  const getItemSize = (item: BagEquipment) => {
    const layoutItem = layout[item.equipment_id];
    return layoutItem?.size || EQUIPMENT_SIZES[item.equipment.category] || 1.0;
  };

  const activeItem = activeId ? items.find(item => item.equipment_id === activeId) : null;

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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(item => item.equipment_id)}
          strategy={rectSortingStrategy}
        >
          <div
            className={cn(
              "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4",
              "bg-gradient-to-b from-black/10 to-black/20 rounded-xl",
              "transition-colors duration-200",
              activeId && "ring-2 ring-primary/50 bg-black/30"
            )}
          >
            {items.map((item) => (
              <SortableItem
                key={item.equipment_id}
                item={item}
                isEditing={isEditing && !showPreview}
                isDragging={!!activeId}
                onEquipmentClick={onEquipmentClick}
                isOwnBag={isOwnBag}
                size={getItemSize(item)}
              />
            ))}
          </div>
        </SortableContext>

        {/* Drag Overlay for smooth dragging */}
        <DragOverlay>
          {activeItem && (
            <div
              className={cn(
                "relative min-h-[120px] rounded-lg overflow-hidden",
                "bg-white/10 border border-white/20 shadow-2xl",
                "cursor-move"
              )}
              style={{
                width: getItemSize(activeItem) >= 1.5 ? '200px' : '150px',
                height: getItemSize(activeItem) >= 1.5 ? '200px' : '150px',
              }}
            >
              <div className="relative h-full flex items-center justify-center p-4">
                {activeItem.custom_photo_url || activeItem.equipment.image_url ? (
                  <img
                    src={activeItem.custom_photo_url || activeItem.equipment.image_url}
                    alt={`${activeItem.equipment.brand} ${activeItem.equipment.model}`}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 rounded-md flex items-center justify-center">
                    <span className="text-gray-400 text-xs text-center px-2">
                      {activeItem.equipment.brand}<br />
                      {activeItem.equipment.model}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Mobile Instructions */}
      {isEditing && !showPreview && (
        <p className="text-center text-sm text-muted-foreground px-4">
          <Grip className="inline h-4 w-4 mr-1" />
          Drag equipment to rearrange your bag layout
        </p>
      )}
    </div>
  );
}