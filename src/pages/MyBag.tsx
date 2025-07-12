import { useState, useEffect } from "react";
import { Plus, Edit3, Save, X, Camera, Image as ImageIcon, Crop, List, Grid, Loader2 } from "lucide-react";
import BackgroundLayer from "@/components/BackgroundLayer";
import BackgroundPicker from "@/components/BackgroundPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import EquipmentSelectorModal from "@/components/EquipmentSelectorModal";
import SubmitEquipmentModal from "@/components/SubmitEquipmentModal";
import EquipmentDetailModal from "@/components/EquipmentDetailModal";
import { EquipmentDetail } from "@/types/equipmentDetail";
import { toast } from "sonner";
import GalleryView from "@/components/gallery/GalleryView";
import { useUserBag } from "@/hooks/useBag";
import { useAuth } from "@/contexts/AuthContext";
import { getEquipmentDetails } from "@/services/equipment";
import { BagItem } from "@/types/equipment";
import type { Database } from "@/lib/supabase";

type Equipment = Database['public']['Tables']['equipment']['Row'];

const MyBag = () => {
  const { user } = useAuth();
  const { bag, bagEquipment, loading, addEquipment, removeEquipment, updateBagName } = useUserBag();
  
  const [isEditing, setIsEditing] = useState(false);
  const [bagName, setBagName] = useState(bag?.name || 'My Bag');
  const [view, setView] = useState<'list' | 'gallery'>('list');
  const [selectedBackground, setSelectedBackground] = useState('midwest-lush');
  
  // Modal states
  const [equipmentSelectorOpen, setEquipmentSelectorOpen] = useState(false);
  const [submitEquipmentOpen, setSubmitEquipmentOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [selectedEquipmentForGallery, setSelectedEquipmentForGallery] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDetail | null>(null);
  const [equipmentDetailModalOpen, setEquipmentDetailModalOpen] = useState(false);

  useEffect(() => {
    if (bag?.name) {
      setBagName(bag.name);
    }
  }, [bag]);

  // Convert bagEquipment to BagItem format for compatibility
  const bagItems: BagItem[] = bagEquipment.map(item => ({
    equipment: {
      id: item.equipment.id,
      brand: item.equipment.brand,
      model: item.equipment.model,
      category: item.equipment.category,
      image: item.equipment.image_url || '',
      msrp: Number(item.equipment.msrp) || 0,
      customSpecs: item.custom_specs,
      specs: {}
    },
    isFeatured: false,
    purchaseDate: item.purchase_date || undefined,
    customNotes: item.notes || undefined
  }));

  const totalValue = bagItems.reduce((sum, item) => sum + item.equipment.msrp, 0);

  const handleSave = async () => {
    setIsEditing(false);
    if (bagName !== bag?.name) {
      await updateBagName(bagName);
      toast.success("Bag name updated!");
    }
  };

  const handleAddEquipment = async (equipment: Equipment) => {
    try {
      await addEquipment(equipment.id);
      setEquipmentSelectorOpen(false);
      toast.success(`Added ${equipment.brand} ${equipment.model} to your bag`);
    } catch (error) {
      toast.error("Failed to add equipment");
    }
  };

  const handleRemoveEquipment = async (index: number) => {
    const item = bagEquipment[index];
    if (item) {
      try {
        await removeEquipment(item.id);
        toast.success("Equipment removed from bag");
      } catch (error) {
        toast.error("Failed to remove equipment");
      }
    }
  };

  const toggleFeatured = (index: number) => {
    // This feature needs to be implemented in the database
    toast.info("Featured equipment coming soon!");
  };

  const handleImageUpload = (index: number) => {
    setSelectedEquipmentForGallery(bagItems[index]?.equipment.id || null);
    setGalleryModalOpen(true);
  };

  const handleEquipmentClick = async (item: BagItem) => {
    try {
      const details = await getEquipmentDetails(item.equipment.id);
      setSelectedEquipment(details as any);
      setEquipmentDetailModalOpen(true);
    } catch (error) {
      toast.error("Failed to load equipment details");
    }
  };

  const handleBackgroundChange = (backgroundId: string) => {
    setSelectedBackground(backgroundId);
    // TODO: Save background preference to user profile
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <BackgroundLayer backgroundId={selectedBackground} />
        <Navigation />
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen relative">
        <BackgroundLayer backgroundId={selectedBackground} />
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Sign in to manage your bag</h2>
            <p className="text-white/80">Create an account to start building your golf bag</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <BackgroundLayer backgroundId={selectedBackground} />
      <Navigation />
      
      {/* Header */}
      <div className="relative z-10 pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              {isEditing ? (
                <Input
                  value={bagName}
                  onChange={(e) => setBagName(e.target.value)}
                  className="text-3xl font-bold bg-white/10 border-white/20 text-white"
                />
              ) : (
                <h1 className="text-4xl font-bold text-white mb-2">{bagName}</h1>
              )}
              <p className="text-white/80">Total Value: ${totalValue.toLocaleString()}</p>
            </div>
            
            <div className="flex gap-4">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} className="gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="outline">
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2">
                    <Edit3 className="w-4 h-4" />
                    Edit Bag
                  </Button>
                  <BackgroundPicker 
                    currentBackground={selectedBackground}
                    onBackgroundChange={handleBackgroundChange}
                  />
                </>
              )}
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4 mr-2" />
              List View
            </Button>
            <Button
              variant={view === 'gallery' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('gallery')}
            >
              <Grid className="w-4 h-4 mr-2" />
              Gallery View
            </Button>
          </div>

          {/* Equipment Display */}
          {view === 'list' ? (
            <div className="space-y-4">
              {bagItems.map((item, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex items-center gap-4">
                  <div className="w-24 h-24 bg-white/20 rounded-lg overflow-hidden">
                    <img 
                      src={item.equipment.image || '/api/placeholder/96/96'} 
                      alt={`${item.equipment.brand} ${item.equipment.model}`}
                      className="w-full h-full object-cover cursor-pointer"
                      loading="lazy"
                      onClick={() => handleEquipmentClick(item)}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {item.equipment.brand} {item.equipment.model}
                    </h3>
                    <p className="text-white/70">{item.equipment.category}</p>
                    {item.equipment.customSpecs && (
                      <p className="text-sm text-white/60">{item.equipment.customSpecs}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/70 hover:text-white"
                      onClick={() => handleImageUpload(index)}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleRemoveEquipment(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {isEditing && (
                <Button
                  onClick={() => setEquipmentSelectorOpen(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Equipment
                </Button>
              )}
            </div>
          ) : (
            <GalleryView 
              bagItems={bagItems}
              isOwnBag={true}
              onEquipmentClick={handleEquipmentClick}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <EquipmentSelectorModal
        open={equipmentSelectorOpen}
        onClose={() => setEquipmentSelectorOpen(false)}
        onSelect={handleAddEquipment}
        onSubmitNew={() => {
          setEquipmentSelectorOpen(false);
          setSubmitEquipmentOpen(true);
        }}
      />

      <SubmitEquipmentModal
        open={submitEquipmentOpen}
        onClose={() => setSubmitEquipmentOpen(false)}
      />

      <EquipmentDetailModal
        equipment={selectedEquipment}
        isOpen={equipmentDetailModalOpen}
        onClose={() => setEquipmentDetailModalOpen(false)}
        isOwnBag={true}
      />
    </div>
  );
};

export default MyBag;