import { useState } from "react";
import { Plus, Edit3, Save, X, Camera, Image as ImageIcon, Crop, List, Grid } from "lucide-react";
import BackgroundLayer from "@/components/BackgroundLayer";
import BackgroundPicker from "@/components/BackgroundPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import { sampleUserBag, sampleUserProfile } from "@/data/sampleBagData";
import { BagItem } from "@/types/equipment";
import EquipmentSelectorModal from "@/components/EquipmentSelectorModal";
import SubmitEquipmentModal from "@/components/SubmitEquipmentModal";
import EquipmentDetailModal from "@/components/EquipmentDetailModal";
import { Equipment } from "@/lib/equipment-types";
import { getEquipmentById } from "@/lib/equipment-database";
import { sampleEquipmentDetails } from "@/data/sampleEquipmentDetails";
import { EquipmentDetail } from "@/types/equipmentDetail";
import { toast } from "sonner";
import GalleryView from "@/components/gallery/GalleryView";

const MyBag = () => {
  const currentUserId = "marcus_johnson"; // In real app, get from auth
  const currentUser = sampleUserProfile;
  
  const [isEditing, setIsEditing] = useState(false);
  const [bagName, setBagName] = useState(sampleUserBag.name);
  const [bagItems, setBagItems] = useState<BagItem[]>(sampleUserBag.items);
  const [view, setView] = useState<'list' | 'gallery'>('list');
  const [selectedBackground, setSelectedBackground] = useState(currentUser.bagBackground || 'midwest-lush');
  
  // Modal states
  const [equipmentSelectorOpen, setEquipmentSelectorOpen] = useState(false);
  const [submitEquipmentOpen, setSubmitEquipmentOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [selectedEquipmentForGallery, setSelectedEquipmentForGallery] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDetail | null>(null);
  const [equipmentDetailModalOpen, setEquipmentDetailModalOpen] = useState(false);
  const totalValue = bagItems.reduce((sum, item) => sum + item.equipment.msrp, 0);

  const saveBagToStorage = () => {
    const bagData = {
      name: bagName,
      items: bagItems,
      totalValue,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem(`bag_${currentUserId}`, JSON.stringify(bagData));
    setHasUnsavedChanges(false);
    toast.success("Bag saved successfully!");
  };

  const handleSave = () => {
    setIsEditing(false);
    saveBagToStorage();
  };

  const addEquipment = (equipment: Equipment) => {
    const newBagItem: BagItem = {
      equipment: {
        id: equipment.id,
        brand: equipment.brand,
        model: equipment.model,
        category: equipment.category as any,
        image: equipment.image,
        msrp: equipment.msrp,
        customSpecs: equipment.specs ? JSON.stringify(equipment.specs) : undefined,
        specs: equipment.specs as any
      },
      isFeatured: false,
      purchaseDate: new Date().toISOString().split('T')[0]
    };
    setBagItems(prev => [...prev, newBagItem]);
    setHasUnsavedChanges(true);
    setEquipmentSelectorOpen(false);
    toast.success(`Added ${equipment.brand} ${equipment.model} to your bag!`);
  };

  const removeItem = (equipmentId: string) => {
    setBagItems(prev => prev.filter(item => item.equipment.id !== equipmentId));
    setHasUnsavedChanges(true);
    toast.success("Equipment removed from bag");
  };

  const toggleFeatured = (equipmentId: string) => {
    setBagItems(prev =>
      prev.map(item =>
        item.equipment.id === equipmentId
          ? { ...item, isFeatured: !item.isFeatured }
          : item
      )
    );
    setHasUnsavedChanges(true);
  };

  const openGallery = (equipmentId: string) => {
    setSelectedEquipmentForGallery(equipmentId);
    setGalleryModalOpen(true);
  };

  const selectImageForCrop = (imageUrl: string) => {
    setImageToCrop(imageUrl);
    setGalleryModalOpen(false);
    setCropModalOpen(true);
  };

  const handleEquipmentClick = (equipment: import("@/types/equipment").Equipment) => {
    const detail = sampleEquipmentDetails[equipment.id];
    if (detail) {
      setSelectedEquipment(detail);
      setEquipmentDetailModalOpen(true);
    }
  };

  const handleBagItemClick = (item: BagItem) => {
    handleEquipmentClick(item.equipment);
  };
  
  const handleToggleFeaturedForBagItem = (item: BagItem) => {
    toggleFeatured(item.equipment.id);
  };
  
  const handleRemoveItemForBagItem = (item: BagItem) => {
    removeItem(item.equipment.id);
  };

  const EmptyState = () => (
    <div className="text-center py-16 space-y-6">
      <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto">
        <Plus className="w-12 h-12 text-gray-400" />
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2 text-white">Start Building Your Dream Bag</h3>
        <p className="text-gray-300">Add equipment to showcase your setup</p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={() => setEquipmentSelectorOpen(true)} className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all">+ Add Driver</button>
        <button onClick={() => setEquipmentSelectorOpen(true)} className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all">+ Add Woods</button>
        <button onClick={() => setEquipmentSelectorOpen(true)} className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all">+ Add Irons</button>
        <button onClick={() => setEquipmentSelectorOpen(true)} className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all">+ Add Wedges</button>
        <button onClick={() => setEquipmentSelectorOpen(true)} className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all">+ Add Putter</button>
        <button onClick={() => setEquipmentSelectorOpen(true)} className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all">+ Add Ball</button>
        <button onClick={() => setEquipmentSelectorOpen(true)} className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all">+ Add Accessories</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative">
      <BackgroundLayer backgroundId={selectedBackground} />
      <BackgroundPicker 
        currentBackground={selectedBackground}
        onBackgroundChange={setSelectedBackground}
      />
      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* Header Section */}
        <div className="pt-20 pb-6">
          <div className="max-w-7xl mx-auto px-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  {isEditing ? (
                    <Input
                      value={bagName}
                      onChange={(e) => {
                        setBagName(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      className="text-2xl font-bold bg-white/10 text-white border-white/20"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-white">{bagName}</h1>
                  )}
                  <div className="flex items-center gap-6 mt-2 text-gray-300">
                    <span className="text-2xl font-bold text-white">${totalValue.toLocaleString()}</span>
                    <span>Total Value</span>
                    <div className="w-px h-6 bg-gray-600" />
                    <span>{bagItems.length} Items</span>
                    <div className="w-px h-6 bg-gray-600" />
                    <span>{bagItems.filter(item => item.isFeatured).length} Featured</span>
                  </div>
                </div>
                
                {/* Buttons moved here - same position as Follow/Share */}
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <Button
                      onClick={handleSave}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </Button>
                  )}
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-all flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </Button>
                  )}
                  <button
                    onClick={() => setView('list')}
                    className={`px-4 py-2 rounded-lg backdrop-blur transition-all flex items-center gap-2 ${
                      view === 'list' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    List
                  </button>
                  <button
                    onClick={() => setView('gallery')}
                    className={`px-4 py-2 rounded-lg backdrop-blur transition-all flex items-center gap-2 ${
                      view === 'gallery' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                    Gallery
                  </button>
                  <button 
                    onClick={() => setEquipmentSelectorOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Equipment
                  </button>
                  {hasUnsavedChanges && !isEditing && (
                    <Button 
                      onClick={saveBagToStorage} 
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment Section - No container, matches other bags */}
        {bagItems.length === 0 ? (
          <div className="max-w-7xl mx-auto px-4 pb-8">
            <EmptyState />
          </div>
        ) : view === 'list' ? (
          <div className="max-w-7xl mx-auto px-4 pb-8">
            <div className="space-y-3">
              {bagItems.map((item) => (
                <div 
                  key={item.equipment.id}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all cursor-pointer"
                  onClick={() => handleEquipmentClick(item.equipment)}
                >
                  <div className="flex items-center gap-4">
                    {/* Equipment Image */}
                    <div className="w-24 h-24 bg-white/10 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={item.equipment.image} 
                        alt={`${item.equipment.brand} ${item.equipment.model}`}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                    
                    {/* Info section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-medium text-white">
                          {item.equipment.brand} {item.equipment.model}
                        </h3>
                        {item.isFeatured && (
                          <span className="text-yellow-400">⭐</span>
                        )}
                      </div>
                      <p className="text-gray-300 capitalize">
                        {item.equipment.category}
                        {item.equipment.customSpecs && ` • ${item.equipment.customSpecs}`}
                      </p>
                    </div>
                    
                    {/* Shaft and Grip columns */}
                    {item.equipment.specs?.shaft && (
                      <div className="text-center px-4 flex-shrink-0">
                        <div className="text-gray-400 text-xs mb-1">Shaft</div>
                        <div className="text-white font-medium">{item.equipment.specs.shaft.model}</div>
                        <div className="text-gray-300 text-xs">{item.equipment.specs.shaft.flex}</div>
                        {item.equipment.specs.shaft.isStock && (
                          <span className="text-xs bg-white/10 px-2 py-0.5 rounded mt-1 inline-block">Stock</span>
                        )}
                      </div>
                    )}
                    
                    {item.equipment.specs?.grip && (
                      <div className="text-center px-4 flex-shrink-0">
                        <div className="text-gray-400 text-xs mb-1">Grip</div>
                        <div className="text-white font-medium">{item.equipment.specs.grip.model}</div>
                        <div className="text-gray-300 text-xs">{item.equipment.specs.grip.size}</div>
                        {item.equipment.specs.grip.isStock && (
                          <span className="text-xs bg-white/10 px-2 py-0.5 rounded mt-1 inline-block">Stock</span>
                        )}
                      </div>
                    )}
                    
                    {/* Actions for My Bag only */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          toggleFeatured(item.equipment.id); 
                        }}
                        className="text-lg hover:text-yellow-400 transition-colors"
                      >
                        {item.isFeatured ? "⭐" : "☆"}
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          removeItem(item.equipment.id); 
                        }}
                        className="text-gray-400 hover:text-red-400 transition-colors p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 pb-8">
            <GalleryView 
              bagItems={bagItems} 
              isOwnBag={true}
              onEquipmentClick={handleBagItemClick}
            />
          </div>
        )}
      </div>

      {/* Equipment Selector Modal */}
      <EquipmentSelectorModal
        isOpen={equipmentSelectorOpen}
        onClose={() => setEquipmentSelectorOpen(false)}
        onSelect={addEquipment}
      />

      {/* Submit Equipment Modal */}
      <SubmitEquipmentModal
        isOpen={submitEquipmentOpen}
        onClose={() => setSubmitEquipmentOpen(false)}
        onSubmit={(equipment) => {
          // Store in localStorage for now
          const submissions = JSON.parse(localStorage.getItem('community_submissions') || '[]');
          submissions.push({
            ...equipment,
            id: `community-${Date.now()}`,
            isVerified: false,
            submittedBy: currentUserId,
            submittedAt: new Date().toISOString()
          });
          localStorage.setItem('community_submissions', JSON.stringify(submissions));
          setSubmitEquipmentOpen(false);
        }}
      />

      {/* Gallery Modal */}
      <Dialog open={galleryModalOpen} onOpenChange={setGalleryModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select Photo</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 p-4">
            {/* Mock gallery images for the selected equipment */}
            {selectedEquipmentForGallery && [1, 2, 3, 4, 5, 6].map((num) => {
              const imageUrl = `/api/placeholder/400/400?text=Photo+${num}`;
              return (
                <div
                  key={num}
                  className="aspect-square bg-muted rounded-lg cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => selectImageForCrop(imageUrl)}
                >
                  <img
                    src={imageUrl}
                    alt={`Photo ${num}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between p-4">
            <Button variant="outline" onClick={() => setSubmitEquipmentOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Equipment
            </Button>
            <Button variant="outline" onClick={() => setGalleryModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop Modal */}
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {imageToCrop && (
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                <img
                  src={imageToCrop}
                  alt="Image to crop"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCropModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // Apply cropped image to equipment
                if (selectedEquipmentForGallery && imageToCrop) {
                  setBagItems(prev =>
                    prev.map(item =>
                      item.equipment.id === selectedEquipmentForGallery
                        ? { ...item, equipment: { ...item.equipment, image: imageToCrop } }
                        : item
                    )
                  );
                  setHasUnsavedChanges(true);
                  toast.success("Image updated!");
                }
                setCropModalOpen(false);
                setSelectedEquipmentForGallery(null);
                setImageToCrop(null);
              }}>
                <Crop className="w-4 h-4 mr-2" />
                Apply Crop
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Equipment Detail Modal */}
      <EquipmentDetailModal
        equipment={selectedEquipment}
        isOpen={equipmentDetailModalOpen}
        onClose={() => setEquipmentDetailModalOpen(false)}
        onToggleFeatured={toggleFeatured}
        isOwnBag={true}
        onUpdate={(updates) => {
          // Handle equipment updates like shaft/grip changes
          if (selectedEquipment) {
            setBagItems(prev =>
              prev.map(item =>
                item.equipment.id === selectedEquipment.id
                  ? { ...item, equipment: { ...item.equipment, ...updates } }
                  : item
              )
            );
            setHasUnsavedChanges(true);
          }
        }}
      />
    </div>
  );
};

export default MyBag;