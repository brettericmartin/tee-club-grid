import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Camera, Upload, Heart, Users, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { fetchEquipmentPhotos } from '@/services/unifiedPhotoService';
import { uploadEquipmentPhoto } from '@/services/equipment';
import { useAuth } from '@/contexts/AuthContext';

interface PhotoSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentName: string;
  selectedPhotoId?: string;
  onSelectPhoto: (photoId: string, photoUrl: string) => void;
}

interface EquipmentPhoto {
  id: string;
  photo_url: string;
  likes_count: number;
  user_id: string;
  created_at: string;
  caption?: string;
  is_primary?: boolean;
}

type SortOption = 'likes' | 'newest' | 'yours';

export function PhotoSelector({
  isOpen,
  onClose,
  equipmentId,
  equipmentName,
  selectedPhotoId,
  onSelectPhoto
}: PhotoSelectorProps) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<EquipmentPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('likes');
  const [uploading, setUploading] = useState(false);

  // Load photos when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPhotos();
    }
  }, [isOpen, equipmentId, sortBy]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const allPhotos = await fetchEquipmentPhotos(equipmentId, 50);
      
      if (allPhotos) {
        let sortedPhotos = [...allPhotos];
        
        switch (sortBy) {
          case 'likes':
            sortedPhotos.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
            break;
          case 'newest':
            sortedPhotos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            break;
          case 'yours':
            if (user) {
              sortedPhotos = sortedPhotos.filter(p => p.user_id === user.id);
              sortedPhotos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            }
            break;
        }
        
        setPhotos(sortedPhotos);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const photoUrl = await uploadEquipmentPhoto(user.id, equipmentId, file, `Photo of ${equipmentName}`);
      
      // Refresh photos to show the new upload
      await loadPhotos();
      
      // Auto-select the newly uploaded photo
      const newPhoto = photos.find(p => p.photo_url === photoUrl);
      if (newPhoto) {
        onSelectPhoto(newPhoto.id, newPhoto.photo_url);
      }
      
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleSelectPhoto = (photo: EquipmentPhoto) => {
    onSelectPhoto(photo.id, photo.photo_url);
    onClose();
  };

  const getSortIcon = (sort: SortOption) => {
    switch (sort) {
      case 'likes': return <Heart className="w-4 h-4" />;
      case 'newest': return <Clock className="w-4 h-4" />;
      case 'yours': return <Users className="w-4 h-4" />;
    }
  };

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'likes': return 'Most Liked';
      case 'newest': return 'Newest';
      case 'yours': return 'Your Photos';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-[#1a1a1a] border border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5" />
            Choose Photo for {equipmentName}
          </DialogTitle>
        </DialogHeader>

        {/* Sort and Upload Controls */}
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">Sort by:</span>
            {(['likes', 'newest', 'yours'] as SortOption[]).map((sort) => (
              <Button
                key={sort}
                variant={sortBy === sort ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(sort)}
                className={cn(
                  "bg-[#2a2a2a] border border-white/10",
                  sortBy === sort && "bg-primary text-white"
                )}
              >
                {getSortIcon(sort)}
                <span className="ml-1">{getSortLabel(sort)}</span>
              </Button>
            ))}
          </div>

          {/* Upload Button */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              className="bg-[#2a2a2a] border border-white/10 hover:bg-[#3a3a3a]"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload New'}
            </Button>
          </div>
        </div>

        {/* Photo Grid */}
        <ScrollArea className="flex-1 min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-white/50">Loading photos...</div>
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-white/50">
              <Camera className="w-12 h-12 mb-4" />
              <p>No photos available</p>
              <p className="text-sm">Upload the first photo for this equipment!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden cursor-pointer group",
                    "border-2 transition-all duration-200",
                    selectedPhotoId === photo.id
                      ? "border-primary ring-2 ring-primary/50"
                      : "border-white/10 hover:border-white/30"
                  )}
                  onClick={() => handleSelectPhoto(photo)}
                >
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || `${equipmentName} photo`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Selection indicator */}
                  {selectedPhotoId === photo.id && (
                    <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  
                  {/* Photo info overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200">
                    <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between text-white text-xs">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{photo.likes_count || 0}</span>
                        </div>
                        {photo.user_id === user?.id && (
                          <span className="bg-primary/80 px-1 rounded text-xs">Yours</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-sm text-white/70">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} available
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PhotoSelector;