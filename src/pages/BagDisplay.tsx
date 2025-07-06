import { useParams } from "react-router-dom";
import { useState } from "react";
import Navigation from "@/components/Navigation";
import BackgroundLayer from "@/components/BackgroundLayer";
import { demoUsers } from "@/data/sampleBagData";
import EquipmentDetailModal from "@/components/EquipmentDetailModal";
import BagHeader from "@/components/bag/BagHeader";
import ViewToggle from "@/components/bag/ViewToggle";
import GalleryView from "@/components/gallery/GalleryView";
import ListView from "@/components/gallery/ListView";
import { sampleUserBag, sampleUserProfile } from "@/data/sampleBagData";
import { sampleEquipmentDetails } from "@/data/sampleEquipmentDetails";
import { BagItem, Equipment } from "@/types/equipment";
import { EquipmentDetail } from "@/types/equipmentDetail";

const BagDisplay = () => {
  const { username } = useParams();
  
  // For now, using sample data - in real app, fetch by username
  const userProfile = demoUsers.find(user => user.username === username) || sampleUserProfile;
  const userBag = sampleUserBag;
  
  const [viewMode, setViewMode] = useState<'list' | 'gallery'>('list');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bagItems, setBagItems] = useState(userBag.items);
  
  // In a real app, you'd get the current user from auth
  const currentUserId = "current_user_123"; // This would come from auth - using placeholder that doesn't match any sample users
  const isOwnBag = userProfile.username === currentUserId;


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
    const detail = sampleEquipmentDetails[item.equipment.id];
    if (detail) {
      setSelectedEquipment(detail);
      setIsModalOpen(true);
    }
  };

  const totalEquipmentCount = bagItems.length;
  const featuredCount = bagItems.filter(item => item.isFeatured).length;

  const bagStats = {
    totalValue: userBag.totalValue,
    itemCount: totalEquipmentCount,
    featuredCount
  };


  return (
    <div className="min-h-screen relative">
      <BackgroundLayer backgroundId={userProfile.bagBackground || 'midwest-lush'} />
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
              <h2 className="text-xl font-bold text-white">{userBag.name}</h2>
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