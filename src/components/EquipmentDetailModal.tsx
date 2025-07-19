import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { EquipmentDetail } from "@/types/equipmentDetail";
import ShaftSelectionModal from "./ShaftSelectionModal";
import GripSelectionModal from "./GripSelectionModal";
import { toast } from "sonner";
import EquipmentImageGallery from "./equipment-detail/EquipmentImageGallery";
import EquipmentHeader from "./equipment-detail/EquipmentHeader";
import EquipmentBuildConfiguration from "./equipment-detail/EquipmentBuildConfiguration";
import EquipmentSpecificationTabs from "./equipment-detail/EquipmentSpecificationTabs";
import EquipmentActionButtons from "./equipment-detail/EquipmentActionButtons";
import { ImageViewerModal } from "./shared/ImageViewerModal";

interface EquipmentDetailModalProps {
  equipment: EquipmentDetail | any | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFeatured?: (equipmentId: string) => void;
  isOwnBag?: boolean;
  onUpdate?: (updates: any) => void;
}

const EquipmentDetailModal = ({ equipment, isOpen, onClose, onToggleFeatured, isOwnBag = false, onUpdate }: EquipmentDetailModalProps) => {
  const [shaftModalOpen, setShaftModalOpen] = useState(false);
  const [gripModalOpen, setGripModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  if (!equipment) return null;

  // Check if this is a full EquipmentDetail object with currentBuild
  const hasFullDetails = equipment.currentBuild && equipment.popularShafts && equipment.popularGrips;

  const handleToggleFeatured = () => {
    if (onToggleFeatured) {
      onToggleFeatured(equipment.id);
    }
  };

  const handleSaveEquipment = () => {
    const saved = localStorage.getItem('savedEquipment') || '[]';
    const savedList = JSON.parse(saved);
    
    if (!savedList.find((item: any) => item.id === equipment.id)) {
      savedList.push({
        id: equipment.id,
        savedDate: new Date().toISOString()
      });
      localStorage.setItem('savedEquipment', JSON.stringify(savedList));
      setIsSaved(true);
      toast.success('Equipment saved to your wishlist!');
    } else {
      toast.info('Equipment already in your wishlist');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="sr-only">Equipment Details</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-8">
            {/* Hero Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <EquipmentImageGallery
                images={equipment.images || [equipment.image || equipment.image_url || '/placeholder.svg']}
                brand={equipment.brand}
                model={equipment.model}
                selectedImageIndex={selectedImageIndex}
                onImageSelect={setSelectedImageIndex}
                equipmentId={equipment.id}
                onImageClick={(imageUrl) => setViewerImageUrl(imageUrl)}
              />
              
              <EquipmentHeader
                equipment={equipment}
                isOwnBag={isOwnBag}
                onToggleFeatured={handleToggleFeatured}
              />
            </div>

            {hasFullDetails && (
              <EquipmentBuildConfiguration
                equipment={equipment}
                isOwnBag={isOwnBag}
                onShaftChange={() => setShaftModalOpen(true)}
                onGripChange={() => setGripModalOpen(true)}
              />
            )}

            <EquipmentSpecificationTabs equipment={equipment} />

            <EquipmentActionButtons
              isOwnBag={isOwnBag}
              equipmentBrand={equipment.brand}
              onSaveEquipment={handleSaveEquipment}
              onClose={onClose}
            />
          </div>
        </DialogContent>
      </Dialog>

      {hasFullDetails && (
        <>
          <ShaftSelectionModal
            isOpen={shaftModalOpen}
            onClose={() => setShaftModalOpen(false)}
            shafts={equipment.popularShafts}
            currentShaft={equipment.currentBuild.shaft}
            onSelect={(shaft) => {
              // Handle shaft selection
              setShaftModalOpen(false);
            }}
          />

          <GripSelectionModal
            isOpen={gripModalOpen}
            onClose={() => setGripModalOpen(false)}
            grips={equipment.popularGrips}
            currentGrip={equipment.currentBuild.grip}
            onSelect={(grip) => {
              // Handle grip selection
              setGripModalOpen(false);
            }}
          />
        </>
      )}
      
      {/* High Resolution Image Viewer */}
      <ImageViewerModal
        isOpen={!!viewerImageUrl}
        onClose={() => setViewerImageUrl(null)}
        imageUrl={viewerImageUrl || ''}
        alt={`${equipment.brand} ${equipment.model} - High Resolution`}
      />
    </>
  );
};

export default EquipmentDetailModal;