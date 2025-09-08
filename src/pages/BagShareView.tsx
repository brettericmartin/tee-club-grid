import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatCompactCurrency } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Share2, 
  Camera,
  Square,
  Smartphone,
  Monitor,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { ViewerEquipmentModal } from '@/components/bag/ViewerEquipmentModal';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'] & {
  primaryPhoto?: string;
};

type BagEquipmentItem = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Equipment;
  shaft?: Equipment;
  grip?: Equipment;
};

type Bag = Database['public']['Tables']['user_bags']['Row'] & {
  profile?: Database['public']['Tables']['profiles']['Row'];
  bag_equipment?: BagEquipmentItem[];
};

// Aspect ratio presets for different social media platforms
const ASPECT_RATIOS = {
  square: { name: 'Square (Instagram)', width: 1080, height: 1080, icon: Square },
  story: { name: 'Story (9:16)', width: 1080, height: 1920, icon: Smartphone },
  landscape: { name: 'Landscape (16:9)', width: 1920, height: 1080, icon: Monitor },
};

export default function BagShareView() {
  const { bagId } = useParams();
  const [bag, setBag] = useState<Bag | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEquipment, setSelectedEquipment] = useState<BagEquipmentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<keyof typeof ASPECT_RATIOS>('square');
  const [isCapturing, setIsCapturing] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);

  useEffect(() => {
    if (bagId) {
      loadBag();
    }
  }, [bagId]);

  const loadBag = async () => {
    try {
      const { data: bagData, error } = await supabase
        .from('user_bags')
        .select(`
          *,
          profiles!user_bags_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            handicap
          ),
          bag_equipment (
            *,
            equipment:equipment_id (*,
              equipment_photos (
                photo_url,
                is_primary,
                likes_count
              )
            ),
            shaft:shaft_id (*),
            grip:grip_id (*)
          )
        `)
        .eq('id', bagId)
        .single();

      if (error) throw error;
      
      // Process equipment photos to get primary photo
      const processedEquipment = bagData.bag_equipment?.map((item: any) => {
        const photos = item.equipment?.equipment_photos || [];
        const primaryPhoto = photos.find((p: any) => p.is_primary)?.photo_url || 
                           photos.sort((a: any, b: any) => (b.likes_count || 0) - (a.likes_count || 0))[0]?.photo_url ||
                           item.equipment?.image_url;
        
        return {
          ...item,
          equipment: {
            ...item.equipment,
            primaryPhoto
          },
          shaft: item.shaft,
          grip: item.grip
        };
      });
      
      setBag({
        ...bagData,
        profile: bagData.profiles,
        bag_equipment: processedEquipment
      });
    } catch (error) {
      console.error('Error loading bag:', error);
      toast.error('Failed to load bag');
    } finally {
      setLoading(false);
    }
  };

  const downloadAsImage = async () => {
    try {
      setIsCapturing(true);
      const element = document.getElementById('bag-share-content');
      if (!element) return;

      const ratio = ASPECT_RATIOS[aspectRatio];
      const dataUrl = await toPng(element, {
        backgroundColor: '#111111',
        width: ratio.width,
        height: ratio.height,
        pixelRatio: 2,
        cacheBust: true,
        style: {
          width: `${ratio.width}px`,
          height: `${ratio.height}px`,
          objectFit: 'cover'
        }
      });

      const link = document.createElement('a');
      link.download = `${bag?.name || 'bag'}-${aspectRatio}-teed-club.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Image downloaded!');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    } finally {
      setIsCapturing(false);
    }
  };

  const copyShareLink = async () => {
    try {
      const baseUrl = window.location.href.replace('/share', '');
      await navigator.clipboard.writeText(baseUrl);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleEquipmentClick = (item: BagEquipmentItem) => {
    if (!isCapturing) {
      setSelectedEquipment(item);
      setModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!bag) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white">Bag not found</div>
      </div>
    );
  }

  const totalValue = bag.bag_equipment?.reduce((sum, item) => 
    sum + (item.equipment?.msrp || 0), 0
  ) || 0;

  const clubCategories = ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'];
  const clubs = bag.bag_equipment?.filter(item => 
    clubCategories.includes(item.equipment?.category || '')
  ) || [];
  const accessories = bag.bag_equipment?.filter(item => 
    !clubCategories.includes(item.equipment?.category || '')
  ) || [];

  // Sort clubs by category order
  const categoryOrder = ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'];
  clubs.sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a.equipment?.category || '');
    const bIndex = categoryOrder.indexOf(b.equipment?.category || '');
    return aIndex - bIndex;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 sm:p-8">
      {/* Controls Bar */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-lg p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-white/70 mr-2">Format:</span>
              {Object.entries(ASPECT_RATIOS).map(([key, ratio]) => {
                const Icon = ratio.icon;
                return (
                  <Button
                    key={key}
                    onClick={() => setAspectRatio(key as keyof typeof ASPECT_RATIOS)}
                    variant={aspectRatio === key ? 'default' : 'outline'}
                    size="sm"
                    className="min-h-[44px]"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{ratio.name}</span>
                    <span className="sm:hidden">{key === 'square' ? '1:1' : key === 'story' ? '9:16' : '16:9'}</span>
                  </Button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowWatermark(!showWatermark)}
                variant="outline"
                size="sm"
                className="min-h-[44px]"
              >
                {showWatermark ? 'Hide' : 'Show'} Logo
              </Button>
              <Button onClick={copyShareLink} variant="outline" size="sm" className="min-h-[44px]">
                <Share2 className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button 
                onClick={downloadAsImage} 
                variant="default" 
                size="sm"
                disabled={isCapturing}
                className="min-h-[44px] bg-[#10B981] hover:bg-[#0D9668]"
              >
                <Download className="w-4 h-4 mr-2" />
                {isCapturing ? 'Capturing...' : 'Download'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="max-w-6xl mx-auto flex justify-center">
        <div 
          className={`
            relative overflow-hidden
            ${aspectRatio === 'square' ? 'aspect-square max-w-2xl' : ''}
            ${aspectRatio === 'story' ? 'aspect-[9/16] max-h-[80vh]' : ''}
            ${aspectRatio === 'landscape' ? 'aspect-video w-full' : ''}
          `}
        >
          {/* Shareable Content */}
          <div 
            id="bag-share-content" 
            className="w-full h-full bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] p-6 sm:p-8 lg:p-12 flex flex-col"
          >
            {/* Header with Profile */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {bag.profile?.avatar_url && (
                  <img 
                    src={bag.profile.avatar_url} 
                    alt={bag.profile?.username}
                    className="w-12 h-12 rounded-full border-2 border-[#10B981]/50"
                  />
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {bag.profile?.display_name || bag.profile?.username}
                  </h2>
                  {bag.profile?.handicap !== null && bag.profile?.handicap !== undefined && (
                    <p className="text-sm text-white/70">
                      {bag.profile.handicap > 0 ? '+' : ''}{bag.profile.handicap} handicap
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{bag.bag_equipment?.length || 0}</p>
                  <p className="text-xs text-white/70">Items</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#10B981]">{formatCompactCurrency(totalValue)}</p>
                  <p className="text-xs text-white/70">Value</p>
                </div>
              </div>
            </div>

            {/* Bag Name */}
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 text-center">
              {bag.name}
            </h1>

            {/* Equipment Grid */}
            <div className="flex-1 overflow-hidden">
              {aspectRatio === 'square' && (
                <div className="grid grid-cols-3 gap-2 h-full">
                  {[...clubs, ...accessories].slice(0, 9).map((item) => (
                    <div 
                      key={item.id}
                      className="relative bg-[#2A2A2A] rounded-lg overflow-hidden aspect-square group"
                      onClick={() => handleEquipmentClick(item)}
                    >
                      {item.equipment.primaryPhoto ? (
                        <img 
                          src={item.equipment.primaryPhoto}
                          alt={`${item.equipment.brand} ${item.equipment.model}`}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                          <p className="text-xs font-medium text-white">{item.equipment.brand}</p>
                          <p className="text-xs text-white/70">{item.equipment.model}</p>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-white font-medium truncate">
                          {item.equipment.brand} {item.equipment.model}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {aspectRatio === 'story' && (
                <div className="space-y-3">
                  {/* Clubs Section */}
                  {clubs.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-[#10B981] mb-2">CLUBS</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {clubs.slice(0, 6).map((item) => (
                          <div 
                            key={item.id}
                            className="bg-[#2A2A2A] rounded-lg overflow-hidden aspect-square">
                          >
                            {item.equipment.primaryPhoto ? (
                              <img 
                                src={item.equipment.primaryPhoto}
                                alt={`${item.equipment.brand} ${item.equipment.model}`}
                                className="w-full h-full object-contain p-2"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                <p className="text-xs font-medium text-white text-center">{item.equipment.brand}</p>
                                <p className="text-xs text-white/70 text-center">{item.equipment.model}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Accessories Section */}
                  {accessories.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-[#10B981] mb-2">ACCESSORIES</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {accessories.slice(0, 4).map((item) => (
                          <div 
                            key={item.id}
                            className="bg-[#2A2A2A] rounded-lg overflow-hidden aspect-square">
                          >
                            {item.equipment.primaryPhoto ? (
                              <img 
                                src={item.equipment.primaryPhoto}
                                alt={`${item.equipment.brand} ${item.equipment.model}`}
                                className="w-full h-full object-contain p-2"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                <p className="text-xs font-medium text-white text-center">{item.equipment.brand}</p>
                                <p className="text-xs text-white/70 text-center">{item.equipment.model}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {aspectRatio === 'landscape' && (
                <div className="grid grid-cols-2 gap-4 h-full">
                  {/* Clubs Column */}
                  <div>
                    <h3 className="text-lg font-semibold text-[#10B981] mb-3">CLUBS</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {clubs.map((item) => (
                        <div 
                          key={item.id}
                          className="bg-[#2a2a2a] rounded-lg overflow-hidden aspect-square"
                        >
                          {item.equipment.primaryPhoto ? (
                            <img 
                              src={item.equipment.primaryPhoto}
                              alt={`${item.equipment.brand} ${item.equipment.model}`}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-1">
                              <p className="text-xs font-medium text-white text-center">{item.equipment.brand}</p>
                              <p className="text-xs text-white/70 text-center truncate">{item.equipment.model}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accessories Column */}
                  <div>
                    <h3 className="text-lg font-semibold text-[#10B981] mb-3">ACCESSORIES</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {accessories.map((item) => (
                        <div 
                          key={item.id}
                          className="bg-[#2a2a2a] rounded-lg overflow-hidden aspect-square"
                        >
                          {item.equipment.primaryPhoto ? (
                            <img 
                              src={item.equipment.primaryPhoto}
                              alt={`${item.equipment.brand} ${item.equipment.model}`}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-1">
                              <p className="text-xs font-medium text-white text-center">{item.equipment.brand}</p>
                              <p className="text-xs text-white/70 text-center truncate">{item.equipment.model}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer/Watermark */}
            {showWatermark && (
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
                    <Camera className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-white font-bold text-lg">teed.club</span>
                </div>
                <p className="text-white/50 text-sm">Share your golf gear</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-6xl mx-auto mt-6">
        <Card className="bg-[#1A1A1A] border-white/10 p-4">
          <p className="text-white/70 text-sm text-center">
            Choose your format, then click "Download" to save the image. Perfect for sharing on social media!
          </p>
        </Card>
      </div>

      {/* Equipment Modal */}
      {selectedEquipment && (
        <ViewerEquipmentModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedEquipment(null);
          }}
          equipment={selectedEquipment.equipment}
          bagEquipment={selectedEquipment}
        />
      )}
    </div>
  );
}