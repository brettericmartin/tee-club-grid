import { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase';
import { TeedBallLike } from '@/components/shared/TeedBallLike';

type EquipmentPhoto = Database['public']['Tables']['equipment_photos']['Row'] & {
  profile?: Database['public']['Tables']['profiles']['Row'];
  is_liked_by_user?: boolean;
};

interface CommunityPhotosGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentId: string;
  onSelectPhoto: (photoUrl: string) => void;
}

export function CommunityPhotosGallery({
  isOpen,
  onClose,
  equipmentId,
  onSelectPhoto,
}: CommunityPhotosGalleryProps) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<EquipmentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && equipmentId) {
      loadPhotos();
    }
  }, [isOpen, equipmentId, user]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      
      // First get all photos for this equipment
      const query = supabase
        .from('equipment_photos')
        .select(`
          *,
          profile:profiles(username, display_name, avatar_url)
        `)
        .eq('equipment_id', equipmentId)
        .order('likes_count', { ascending: false });

      const { data: photosData, error } = await query;
      
      if (error) throw error;

      // If user is logged in, check which photos they've liked
      if (user && photosData) {
        const { data: userLikes } = await supabase
          .from('equipment_photo_likes')
          .select('photo_id')
          .eq('user_id', user.id)
          .in('photo_id', photosData.map(p => p.id));

        const likedPhotoIds = new Set(userLikes?.map(l => l.photo_id) || []);
        
        // Add is_liked_by_user flag and sort
        const photosWithLikes = photosData.map(photo => ({
          ...photo,
          is_liked_by_user: likedPhotoIds.has(photo.id)
        }));

        // Sort: user's liked photos first, then by likes_count
        photosWithLikes.sort((a, b) => {
          if (a.is_liked_by_user && !b.is_liked_by_user) return -1;
          if (!a.is_liked_by_user && b.is_liked_by_user) return 1;
          return (b.likes_count || 0) - (a.likes_count || 0);
        });

        setPhotos(photosWithLikes);
      } else {
        setPhotos(photosData || []);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error('Failed to load community photos');
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (photoId: string, isLiked: boolean) => {
    if (!user) {
      toast.error('Please sign in to like photos');
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('equipment_photo_likes')
          .delete()
          .eq('photo_id', photoId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('equipment_photo_likes')
          .insert({
            photo_id: photoId,
            user_id: user.id
          });
      }

      // Update local state
      setPhotos(photos.map(photo => 
        photo.id === photoId 
          ? { 
              ...photo, 
              is_liked_by_user: !isLiked,
              likes_count: (photo.likes_count || 0) + (isLiked ? -1 : 1)
            }
          : photo
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleSelectPhoto = () => {
    // Always call onSelectPhoto, even with empty string to allow clearing
    onSelectPhoto(selectedPhoto || '');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-full sm:max-w-4xl h-full sm:h-auto max-h-[100vh] sm:max-h-[90vh] p-0 sm:p-6">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-4 sm:p-0 pb-2 sm:pb-4">
            <DialogTitle>Community Photos</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 px-4 sm:px-0 overflow-hidden">
            {/* Selected Photo Preview */}
            {selectedPhoto && (
              <div className="relative w-full h-32 sm:h-64 bg-accent rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={selectedPhoto}
                  alt="Selected photo"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            )}

            {/* Photo Grid */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-square bg-accent animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : photos.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No community photos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 pb-4">
                  {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden ${
                      selectedPhoto === photo.photo_url 
                        ? 'ring-2 ring-primary ring-offset-2' 
                        : 'hover:ring-2 hover:ring-primary/50'
                    }`}
                    onClick={() => setSelectedPhoto(photo.photo_url)}
                  >
                    <div className="aspect-square bg-accent">
                      <img
                        src={photo.photo_url}
                        alt="Community photo"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    
                    {/* Overlay with info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <div className="flex items-center justify-between text-white">
                          <span className="text-xs truncate">
                            @{photo.profile?.display_name || photo.profile?.username || 'Anonymous'}
                          </span>
                          <div onClick={(e) => e.stopPropagation()}>
                            <TeedBallLike
                              isLiked={photo.is_liked_by_user || false}
                              likeCount={photo.likes_count || 0}
                              onLike={async () => {
                                await toggleLike(photo.id, photo.is_liked_by_user || false);
                              }}
                              size="sm"
                              showCount={true}
                              className="text-white hover:text-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions - Fixed at bottom on mobile */}
          <div className="flex justify-end gap-2 p-4 sm:p-0 pt-2 sm:pt-4 border-t sm:border-0">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSelectPhoto} 
              disabled={false}
              className="flex-1 sm:flex-initial"
            >
              Use Selected Photo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}