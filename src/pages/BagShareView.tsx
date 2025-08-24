import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatCompactCurrency } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, List, Grid3x3, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { ViewerEquipmentModal } from '@/components/bag/ViewerEquipmentModal';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'];
type BagEquipmentItem = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Equipment;
  shaft?: Equipment;
  grip?: Equipment;
};

type Bag = Database['public']['Tables']['user_bags']['Row'] & {
  profile?: Database['public']['Tables']['profiles']['Row'];
  bag_equipment?: BagEquipmentItem[];
};

export default function BagShareView() {
  const { bagId } = useParams();
  const [bag, setBag] = useState<Bag | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedEquipment, setSelectedEquipment] = useState<BagEquipmentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
            equipment:equipment_id (*),
            shaft:shaft_id (*),
            grip:grip_id (*)
          )
        `)
        .eq('id', bagId)
        .single();

      if (error) throw error;
      
      // Map the data to match our types
      const mappedBagEquipment = bagData.bag_equipment?.map((item: any) => ({
        ...item,
        equipment: item.equipment,
        shaft: item.shaft,
        grip: item.grip
      }));
      
      setBag({
        ...bagData,
        profile: bagData.profiles,
        bag_equipment: mappedBagEquipment
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
      const element = document.getElementById('bag-share-content');
      if (!element) return;

      const dataUrl = await toPng(element, {
        backgroundColor: '#111111',
        pixelRatio: 2,
        cacheBust: true
      });

      const link = document.createElement('a');
      link.download = `${bag?.name || 'bag'}-teed-club.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Image downloaded!');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleEquipmentClick = (item: BagEquipmentItem) => {
    setSelectedEquipment(item);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!bag) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-[#111111] p-4 sm:p-8">
      {/* Controls */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setViewMode('card')}
            variant={viewMode === 'card' ? 'default' : 'outline'}
            size="sm"
          >
            <Grid3x3 className="w-4 h-4 mr-2" />
            Card View
          </Button>
          <Button
            onClick={() => setViewMode('list')}
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
          >
            <List className="w-4 h-4 mr-2" />
            List View
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={copyShareLink} variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          <Button onClick={downloadAsImage} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download Image
          </Button>
        </div>
      </div>

      {/* Shareable Content */}
      <div id="bag-share-content" className="max-w-4xl mx-auto">
        <Card className="bg-[#1a1a1a] border-white/10 p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">{bag.name}</h1>
            <p className="text-white/70">
              by {bag.profile?.display_name || bag.profile?.username}
              {bag.profile?.handicap !== null && bag.profile?.handicap !== undefined && (
                <span> • {bag.profile.handicap > 0 ? '+' : ''}{bag.profile.handicap} handicap</span>
              )}
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{bag.bag_equipment?.length || 0}</p>
                <p className="text-sm text-white/70">Items</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{formatCompactCurrency(totalValue)}</p>
                <p className="text-sm text-white/70">Total Value</p>
              </div>
            </div>
          </div>

          {viewMode === 'card' ? (
            /* Card View - Visual Grid */
            <div className="space-y-6">
              {/* Clubs */}
              {clubs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Clubs</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {clubs.map((item) => (
                      <div 
                        key={item.id} 
                        className="bg-[#2a2a2a] rounded-lg p-4 cursor-pointer hover:bg-[#3a3a3a] transition-colors"
                        onClick={() => handleEquipmentClick(item)}
                      >
                        <p className="font-medium text-white text-sm">{item.equipment.brand}</p>
                        <p className="text-xs text-white/70">{item.equipment.model}</p>
                        <p className="text-xs text-white/50 capitalize mt-1">
                          {item.equipment.category.replace('_', ' ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accessories */}
              {accessories.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Accessories</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {accessories.map((item) => (
                      <div 
                        key={item.id} 
                        className="bg-[#2a2a2a] rounded-lg p-4 cursor-pointer hover:bg-[#3a3a3a] transition-colors"
                        onClick={() => handleEquipmentClick(item)}
                      >
                        <p className="font-medium text-white text-sm">{item.equipment.brand}</p>
                        <p className="text-xs text-white/70">{item.equipment.model}</p>
                        <p className="text-xs text-white/50 capitalize mt-1">
                          {item.equipment.category.replace('_', ' ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* List View - Detailed List */
            <div className="space-y-2">
              {bag.bag_equipment?.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-[#2a2a2a] rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-[#3a3a3a] transition-colors"
                  onClick={() => handleEquipmentClick(item)}
                >
                  <div>
                    <p className="font-medium text-white">
                      {item.equipment.brand} {item.equipment.model}
                    </p>
                    <p className="text-sm text-white/70 capitalize">
                      {item.equipment.category.replace('_', ' ')}
                    </p>
                  </div>
                  {item.equipment.msrp && (
                    <p className="text-sm text-white/70">
                      {formatCompactCurrency(item.equipment.msrp)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-white/50 text-sm">
              View this bag on <span className="text-primary font-semibold">teed.club</span>
            </p>
          </div>
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