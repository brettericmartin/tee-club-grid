import { useState, useEffect } from 'react';
import { Eye, Share2, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { CATEGORY_DISPLAY_NAMES } from '@/lib/equipment-categories';

type BagEquipmentItem = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Database['public']['Tables']['equipment']['Row'];
  shaft?: Database['public']['Tables']['shafts']['Row'];
  grip?: Database['public']['Tables']['grips']['Row'];
  loft_option?: Database['public']['Tables']['loft_options']['Row'];
};

type Bag = Database['public']['Tables']['user_bags']['Row'] & {
  profile?: Database['public']['Tables']['profiles']['Row'];
};

interface BagPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  bag: Bag;
  equipment: BagEquipmentItem[];
}

export function BagPreview({ isOpen, onClose, bag, equipment }: BagPreviewProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Generate shareable URL
      const url = `${window.location.origin}/bags/${bag.id}`;
      setShareUrl(url);

      // Load background image
      loadBackgroundImage();
    }
  }, [isOpen, bag.id]);

  const loadBackgroundImage = async () => {
    try {
      // Map background names to actual image URLs
      const backgroundMap: Record<string, string> = {
        'midwest-lush': '/images/midwest-lush.jpg',
        'southwest-arid': '/images/southwest-arid.jpg',
        'northeast-fall': '/images/northeast-fall.jpg',
        'southeast-coastal': '/images/southeast-coastal.jpg',
        'northwest-evergreen': '/images/northwest-evergreen.jpg',
        'linksland': '/images/linksland.jpg',
        'parkland': '/images/parkland.jpg',
        'desert': '/images/desert.jpg',
      };

      setBackgroundImage(backgroundMap[bag.background_image || 'midwest-lush'] || backgroundMap['midwest-lush']);
    } catch (error) {
      console.error('Error loading background:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // Group equipment by category
  const groupedEquipment = equipment.reduce((acc, item) => {
    const category = item.equipment.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, BagEquipmentItem[]>);

  const categoryOrder = [
    'driver',
    'fairway_wood',
    'hybrid',
    'iron',
    'wedge',
    'putter',
    'ball',
    'bag',
    'glove',
    'rangefinder',
    'gps',
    'tee',
    'towel',
    'ball_marker',
    'divot_tool',
    'accessories'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Bag Preview</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Preview Container */}
        <div className="relative rounded-lg overflow-hidden bg-gradient-to-b from-background to-accent">
          {/* Background Image */}
          {backgroundImage && (
            <div className="absolute inset-0 opacity-20">
              <img
                src={backgroundImage}
                alt="Bag background"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={bag.profile?.avatar_url || ''} />
                  <AvatarFallback>
                    {bag.profile?.display_name?.charAt(0) ||
                      bag.profile?.username?.charAt(0) ||
                      'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{bag.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {bag.profile?.display_name || bag.profile?.username || 'Unknown User'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground capitalize">
                  {bag.bag_type} Bag
                </div>
                {bag.is_primary && (
                  <div className="text-xs text-primary font-medium">Primary Bag</div>
                )}
              </div>
            </div>

            {/* Description */}
            {bag.description && (
              <p className="text-sm text-muted-foreground italic">
                "{bag.description}"
              </p>
            )}

            {/* Featured Equipment */}
            {equipment.some(e => e.is_featured) && (
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Featured Equipment
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {equipment
                    .filter(item => item.is_featured)
                    .map((item) => (
                      <div key={item.id} className="bg-[#1a1a1a] rounded-lg p-3 space-y-2">
                        <div className="aspect-square rounded overflow-hidden bg-accent">
                          {item.custom_photo_url || item.equipment.image_url ? (
                            <img
                              src={item.custom_photo_url || item.equipment.image_url}
                              alt={`${item.equipment.brand} ${item.equipment.model}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  // Create React elements instead of using innerHTML
                                  const fallbackDiv = document.createElement('div');
                                  fallbackDiv.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40';
                                  const fallbackSpan = document.createElement('span');
                                  fallbackSpan.className = 'text-white font-bold text-lg';
                                  fallbackSpan.textContent = item.equipment.brand?.split(' ')
                                    .filter(w => w.length > 0)
                                    .map(w => w[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2) || 'NA';
                                  fallbackDiv.appendChild(fallbackSpan);
                                  parent.appendChild(fallbackDiv);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                              <span className="text-white font-bold text-lg">
                                {item.equipment.brand?.split(' ')
                                  .filter(w => w.length > 0)
                                  .map(w => w[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2) || 'NA'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {item.equipment.brand} {item.equipment.model}
                          </div>
                          {item.loft_option && (
                            <div className="text-xs text-muted-foreground">
                              {item.loft_option.display_name}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Full Equipment List */}
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <h3 className="font-semibold mb-3">Complete Bag Setup</h3>
              <div className="space-y-4">
                {categoryOrder.map((category) => {
                  const items = groupedEquipment[category];
                  if (!items || items.length === 0) return null;

                  return (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        {CATEGORY_DISPLAY_NAMES[category as keyof typeof CATEGORY_DISPLAY_NAMES] || category}
                      </h4>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-[#1a1a1a] transition-colors"
                          >
                            <div className="w-12 h-12 rounded bg-accent overflow-hidden flex-shrink-0">
                              {item.custom_photo_url || item.equipment.image_url ? (
                                <img
                                  src={item.custom_photo_url || item.equipment.image_url}
                                  alt={`${item.equipment.brand} ${item.equipment.model}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      // Create React elements instead of using innerHTML
                                      const fallbackDiv = document.createElement('div');
                                      fallbackDiv.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40';
                                      const fallbackSpan = document.createElement('span');
                                      fallbackSpan.className = 'text-white font-bold text-xs';
                                      fallbackSpan.textContent = item.equipment.brand?.split(' ')
                                        .filter(w => w.length > 0)
                                        .map(w => w[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2) || 'NA';
                                      fallbackDiv.appendChild(fallbackSpan);
                                      parent.appendChild(fallbackDiv);
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                                  <span className="text-white font-bold text-xs">
                                    {item.equipment.brand?.split(' ')
                                      .filter(w => w.length > 0)
                                      .map(w => w[0])
                                      .join('')
                                      .toUpperCase()
                                      .slice(0, 2) || 'NA'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">
                                {item.equipment.brand} {item.equipment.model}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {item.shaft && `${item.shaft.brand} ${item.shaft.model} - ${item.shaft.flex}`}
                                {item.grip && ` • ${item.grip.brand} ${item.grip.model}`}
                                {item.loft_option && ` • ${item.loft_option.display_name}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold">{equipment.length}</div>
                <div className="text-xs text-muted-foreground">Total Clubs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {equipment.filter(e => e.condition === 'new').length}
                </div>
                <div className="text-xs text-muted-foreground">New Clubs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {equipment.filter(e => e.is_featured).length}
                </div>
                <div className="text-xs text-muted-foreground">Featured</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              window.open(shareUrl, '_blank');
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Bag
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BagPreview;