import { useState, useEffect } from 'react';
import { 
  Upload, X, Star, Loader2, 
  Camera, Grid, List, SortDesc 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TeedBallLike } from '@/components/shared/TeedBallLike';
import { UnifiedPhotoUploadDialog } from '@/components/shared/UnifiedPhotoUploadDialog';

interface EquipmentPhoto {
  id: string;
  photo_url: string;
  caption?: string;
  is_primary: boolean;
  likes_count: number;
  user_liked?: boolean;
  created_at: string;
  user?: {
    username: string;
    avatar_url?: string;
  };
  metadata?: {
    source?: string;
    width?: number;
    height?: number;
  };
}

interface EquipmentPhotoRepositoryProps {
  equipmentId: string;
  equipmentName: string;
  brand: string;
  model: string;
}

export function EquipmentPhotoRepository({ 
  equipmentId, 
  equipmentName,
  brand,
  model
}: EquipmentPhotoRepositoryProps) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<EquipmentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'likes' | 'newest' | 'oldest'>('likes');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhoto, setSelectedPhoto] = useState<EquipmentPhoto | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [equipmentId, sortBy]);

  const loadPhotos = async () => {
    try {
      let query = supabase
        .from('equipment_photos')
        .select(`
          *,
          user:profiles!equipment_photos_user_id_fkey (
            username,
            avatar_url
          ),
          user_liked:equipment_photo_likes!left (
            id
          )
        `)
        .eq('equipment_id', equipmentId);

      // Apply sorting
      switch (sortBy) {
        case 'likes':
          query = query.order('likes_count', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Process data to include user_liked boolean
      const processedPhotos = (data || []).map(photo => ({
        ...photo,
        user_liked: user ? photo.user_liked?.length > 0 : false
      }));
      
      setPhotos(processedPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (photoId: string) => {
    if (!user) {
      toast.error('Please sign in to like photos');
      return;
    }

    try {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return;

      if (photo.user_liked) {
        // Unlike: Remove like
        await supabase
          .from('equipment_photo_likes')
          .delete()
          .eq('photo_id', photoId)
          .eq('user_id', user.id);
      } else {
        // Like: Add like
        await supabase
          .from('equipment_photo_likes')
          .insert({
            photo_id: photoId,
            user_id: user.id
          });
      }

      // Reload photos to get updated like counts
      await loadPhotos();
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error; // Let TeedBallLike component handle the error display
    }
  };

  const handleUploadComplete = async (photoUrl: string) => {
    // The UnifiedPhotoUploadDialog already handles the upload to storage
    // and creates the feed post, so we just need to reload the photos
    await loadPhotos();
    toast.success('Photo uploaded successfully!');
  };


  const PhotoCard = ({ photo }: { photo: EquipmentPhoto }) => {
    return (
      <Card className="group relative overflow-hidden">
        <div 
          className="cursor-pointer"
          onClick={() => setSelectedPhoto(photo)}
        >
          <img
            src={photo.photo_url}
            alt={photo.caption || 'Equipment photo'}
            className="w-full h-64 object-cover"
            loading="lazy"
          />
          
          {photo.is_primary && (
            <Badge className="absolute top-2 left-2">
              <Star className="w-3 h-3 mr-1" />
              Primary
            </Badge>
          )}

          {photo.metadata?.source && (
            <Badge variant="secondary" className="absolute top-2 right-2">
              {photo.metadata.source}
            </Badge>
          )}
        </div>

        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <TeedBallLike
              isLiked={photo.user_liked || false}
              likeCount={photo.likes_count || 0}
              onLike={() => handleLike(photo.id)}
              size="md"
              showCount={true}
            />
          </div>

          {photo.caption && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {photo.caption}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>by {photo.user?.username || 'Unknown'}</span>
            <span>{new Date(photo.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Photo Repository</h3>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="likes">Most Liked</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 border rounded-md">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="px-2"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="px-2"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {user && (
            <Button onClick={() => setShowUploadDialog(true)} size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          )}
        </div>
      </div>

      {/* Photo Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted" />
          ))}
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-4"
        }>
          {photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && photos.length === 0 && (
        <Card className="p-12 text-center">
          <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No photos yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to add photos of the {equipmentName}
          </p>
          {user && (
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </Button>
          )}
        </Card>
      )}

      {/* Photo Detail Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl">
            <img
              src={selectedPhoto.photo_url}
              alt={selectedPhoto.caption || 'Equipment photo'}
              className="w-full max-h-[70vh] object-contain"
            />
            <div className="mt-4 space-y-2">
              {selectedPhoto.caption && (
                <p className="text-lg">{selectedPhoto.caption}</p>
              )}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Uploaded by {selectedPhoto.user?.username}</span>
                <span>{new Date(selectedPhoto.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}


      {/* Upload Dialog */}
      <UnifiedPhotoUploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onUploadComplete={handleUploadComplete}
        context={{
          type: 'equipment',
          equipmentId: equipmentId,
          equipmentName: equipmentName
        }}
      />
    </div>
  );
}