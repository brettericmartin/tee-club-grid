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

interface EquipmentDetailModalProps {
  equipment: EquipmentDetail | null;
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

  if (!equipment) return null;

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
                images={equipment.images}
                brand={equipment.brand}
                model={equipment.model}
                selectedImageIndex={selectedImageIndex}
                onImageSelect={setSelectedImageIndex}
              />
              
              <EquipmentHeader
                equipment={equipment}
                isOwnBag={isOwnBag}
                onToggleFeatured={handleToggleFeatured}
              />
            </div>

            <EquipmentBuildConfiguration
              equipment={equipment}
              isOwnBag={isOwnBag}
              onShaftChange={() => setShaftModalOpen(true)}
              onGripChange={() => setGripModalOpen(true)}
            />

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
  );
};

export default EquipmentDetailModal;