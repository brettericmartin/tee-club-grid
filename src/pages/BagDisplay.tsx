import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import BackgroundLayer from "@/components/BackgroundLayer";
import EquipmentDetailModal from "@/components/EquipmentDetailModal";
import BagHeader from "@/components/bag/BagHeader";
import ViewToggle from "@/components/bag/ViewToggle";
import GalleryView from "@/components/gallery/GalleryView";
import ListView from "@/components/gallery/ListView";
import { BagItem } from "@/types/equipment";
import { EquipmentDetail } from "@/types/equipmentDetail";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Database } from "@/lib/supabase";

type Equipment = Database['public']['Tables']['equipment']['Row'];
type UserBag = Database['public']['Tables']['user_bags']['Row'];
type BagEquipment = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Equipment;
};

const BagDisplay = () => {
  const { bagId } = useParams();
  const { user: currentUser } = useAuth();
  
  const [viewMode, setViewMode] = useState<'list' | 'gallery'>('list');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bagItems, setBagItems] = useState<BagItem[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userBag, setUserBag] = useState<UserBag | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadBagById();
  }, [bagId]);
  
  const loadBagById = async () => {
    try {
      setLoading(true);
      
      // Get bag by ID with user profile
      const { data: bagData, error: bagError } = await supabase
        .from('user_bags')
        .select(`
          *,
          profiles (*)
        `)
        .eq('id', bagId)
        .single();
        
      if (bagError || !bagData) {
        toast.error('Bag not found');
        return;
      }
      
      setUserBag(bagData);
      setUserProfile(bagData.profiles);
      
      // Get bag equipment
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('bag_equipment')
        .select(`
          *,
          equipment (*)
        `)
        .eq('bag_id', bagData.id);
        
      if (equipmentError) {
        console.error('Error loading equipment:', equipmentError);
        return;
      }
      
      // Convert to BagItem format
      const items: BagItem[] = (equipmentData || []).map((item: any) => ({
        equipment: {
          id: item.equipment.id,
          brand: item.equipment.brand,
          model: item.equipment.model,
          category: item.equipment.category,
          image: item.equipment.image_url || '',
          msrp: Number(item.equipment.msrp) || 0,
          customSpecs: item.custom_specs,
          specs: item.equipment.specs || {}
        },
        isFeatured: false,
        purchaseDate: item.purchase_date || undefined,
        customNotes: item.notes || undefined
      }));
      
      setBagItems(items);
    } catch (error) {
      console.error('Error loading bag display:', error);
      toast.error('Failed to load bag');
    } finally {
      setLoading(false);
    }
  };
  
  const isOwnBag = currentUser?.id === userProfile?.id;


  const handleToggleFeatured = (equipmentId: string) => {
    setBagItems(prevItems =>
      prevItems.map(item =>
        item.equipment.id === equipmentId
          ? { ...item, isFeatured: !item.isFeatured }
          : item
      )
    );
    
    if (selectedEquipment && selectedEquipment.id === equipmentId) {
      setSelectedEquipment(prev => prev ? { ...prev, isFeatured: !prev.isFeatured } : null);
    }
  };

  const handleEquipmentClick = (item: BagItem) => {
    // Convert BagItem to EquipmentDetail format
    const detail: EquipmentDetail = {
      id: item.equipment.id,
      brand: item.equipment.brand,
      model: item.equipment.model,
      category: item.equipment.category,
      specs: item.equipment.specs || {},
      msrp: item.equipment.msrp,
      description: "Professional golf equipment",
      features: [],
      images: [item.equipment.image],
      popularShafts: [],
      popularGrips: [],
      currentBuild: {
        shaft: {
          id: "stock",
          brand: item.equipment.brand,
          model: "Stock",
          flex: "Regular",
          weight: "Standard",
          price: 0,
          imageUrl: "",
          isStock: true
        },
        grip: {
          id: "stock",
          brand: item.equipment.brand,
          model: "Stock",
          size: "Standard",
          price: 0,
          imageUrl: "",
          isStock: true
        },
        totalPrice: item.equipment.msrp
      },
      isFeatured: item.isFeatured || false
    };
    
    setSelectedEquipment(detail);
    setIsModalOpen(true);
  };

  const totalEquipmentCount = bagItems.length;
  const featuredCount = bagItems.filter(item => item.isFeatured).length;
  const totalValue = bagItems.reduce((sum, item) => sum + item.equipment.msrp, 0);

  const bagStats = {
    totalValue,
    itemCount: totalEquipmentCount,
    featuredCount
  };


  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <BackgroundLayer backgroundId="midwest-lush" />
        <Navigation />
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }
  
  if (!userProfile || !userBag) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <BackgroundLayer backgroundId="midwest-lush" />
        <Navigation />
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">User or bag not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <BackgroundLayer backgroundId={userProfile.bag_background || 'midwest-lush'} />
      <Navigation />
      
      {/* Immersive Layout */}
      <div className="relative min-h-screen">
        <BagHeader 
          userProfile={userProfile}
          bagStats={bagStats}
          isOwnBag={isOwnBag}
          courseImage="/api/placeholder/1920/1080" // Course backdrop
        />

        {/* Content Area */}
        <div className="bg-gradient-to-b from-transparent to-black/20">
          {/* View Toggle Bar */}
          <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{userBag?.name || 'My Bag'}</h2>
              <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>
          </div>

          {/* Equipment Display */}
          <div className="max-w-7xl mx-auto">
            {viewMode === 'list' ? (
              <ListView 
                bagItems={bagItems}
                isOwnBag={isOwnBag}
                onEquipmentClick={handleEquipmentClick}
              />
            ) : (
              <GalleryView 
                bagItems={bagItems}
                isOwnBag={isOwnBag}
                onEquipmentClick={handleEquipmentClick}
              />
            )}
          </div>
        </div>
      </div>

      <EquipmentDetailModal
        equipment={selectedEquipment}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onToggleFeatured={handleToggleFeatured}
        isOwnBag={isOwnBag}
      />
    </div>
  );
};

export default BagDisplay;