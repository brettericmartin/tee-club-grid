import React, { useState, useCallback, useMemo } from 'react';
import { X, Upload, Image, Loader2, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createMultiEquipmentPost, type PhotoUpload } from '@/services/multiEquipmentUpload';
import { EquipmentSelectorSimple } from '../equipment/EquipmentSelectorSimple';
import { v4 as uuidv4 } from 'uuid';

interface MultiEquipmentPhotoUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MultiEquipmentPhotoUpload({ 
  isOpen, 
  onClose, 
  onSuccess 
}: MultiEquipmentPhotoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [overallCaption, setOverallCaption] = useState('');
  const [showEquipmentSelector, setShowEquipmentSelector] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Limit to 10 photos total
    const remainingSlots = 10 - photos.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      toast.warning(`Only ${remainingSlots} more photos can be added (max 10)`);
    }
    
    const newPhotos = filesToAdd.map((file, index) => ({
      id: uuidv4(),
      file,
      previewUrl: URL.createObjectURL(file),
      equipmentId: null,
      equipmentName: null,
      caption: '',
      order: photos.length + index
    }));
    
    setPhotos(prev => [...prev, ...newPhotos]);
  }, [photos.length]);

  const handleRemovePhoto = useCallback((photoId: string) => {
    setPhotos(prev => {
      const filtered = prev.filter(p => p.id !== photoId);
      // Reorder remaining photos
      return filtered.map((p, index) => ({ ...p, order: index }));
    });
  }, []);

  const handleCaptionChange = useCallback((photoId: string, caption: string) => {
    setPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, caption } : p
    ));
  }, []);

  const handleEquipmentSelect = useCallback((equipment: { id: string; brand: string; model: string }) => {
    if (!selectedPhotoId) return;
    
    setPhotos(prev => prev.map(p => 
      p.id === selectedPhotoId 
        ? { 
            ...p, 
            equipmentId: equipment.id, 
            equipmentName: `${equipment.brand} ${equipment.model}` 
          }
        : p
    ));
    
    setShowEquipmentSelector(false);
    setSelectedPhotoId(null);
  }, [selectedPhotoId]);

  const handleSubmit = async () => {
    if (!user || photos.length < 2) {
      toast.error('Please add at least 2 photos');
      return;
    }

    setUploading(true);
    try {
      const result = await createMultiEquipmentPost(
        user.id,
        photos,
        overallCaption
      );

      if (result.success) {
        toast.success('Multi-photo post created successfully!');
        onSuccess?.();
        handleClose();
      } else {
        throw new Error(result.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    // Clean up preview URLs
    photos.forEach(photo => URL.revokeObjectURL(photo.previewUrl));
    
    setPhotos([]);
    setOverallCaption('');
    onClose();
  };

  const canSubmit = photos.length >= 2 && photos.length <= 10;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Share Multiple Equipment Photos</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Photo Grid */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">
                  Photos ({photos.length}/10)
                </label>
                {photos.length < 10 && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                      asChild
                    >
                      <span>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Photos
                      </span>
                    </Button>
                  </label>
                )}
              </div>
              
              {photos.length === 0 ? (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-white/20 rounded-lg hover:border-primary/50 transition-colors">
                    <Upload className="h-12 w-12 text-white/40 mb-2" />
                    <span className="text-sm text-white/60">Click to upload 2-10 photos</span>
                  </div>
                </label>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-white/5">
                        <img
                          src={photo.previewUrl}
                          alt={`Photo ${photo.order + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Photo Controls Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedPhotoId(photo.id);
                              setShowEquipmentSelector(true);
                            }}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                            title="Tag Equipment"
                          >
                            <Image className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemovePhoto(photo.id)}
                            className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Photo Number Badge */}
                        <div className="absolute top-2 left-2 bg-black/70 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          {photo.order + 1}
                        </div>
                        
                        {/* Equipment Tag */}
                        {photo.equipmentName && (
                          <div className="absolute bottom-2 left-2 right-2 bg-black/70 rounded px-2 py-1">
                            <p className="text-xs truncate">{photo.equipmentName}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Individual Caption */}
                      <input
                        type="text"
                        placeholder="Caption (optional)"
                        value={photo.caption}
                        onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                        className="mt-2 w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white placeholder:text-white/40"
                        maxLength={100}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overall Caption */}
            <div>
              <label className="block text-sm font-medium mb-2">Overall Caption</label>
              <Textarea
                value={overallCaption}
                onChange={(e) => setOverallCaption(e.target.value)}
                placeholder="Share your thoughts about this equipment collection..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[100px]"
                maxLength={500}
              />
              <div className="text-xs text-white/40 mt-1">{overallCaption.length}/500</div>
            </div>

            {/* Equipment Count Info */}
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-sm text-white/60">
                {photos.filter(p => p.equipmentId).length} of {photos.length} photos tagged with equipment.
                Tagged photos will be added to the equipment gallery for others to discover!
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={!canSubmit || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Image className="h-4 w-4 mr-2" />
                    Post {photos.length} Photos
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Equipment Selector Dialog */}
      {showEquipmentSelector && (
        <EquipmentSelectorSimple
          isOpen={showEquipmentSelector}
          onClose={() => {
            setShowEquipmentSelector(false);
            setSelectedPhotoId(null);
          }}
          onSelect={handleEquipmentSelect}
        />
      )}
    </>
  );
}