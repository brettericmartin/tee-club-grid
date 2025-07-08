import { useState, useEffect } from 'react';
import { 
  Upload, X, Star, Loader2, ThumbsUp, ThumbsDown, 
  Download, ExternalLink, Camera, Grid, List, SortDesc 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { uploadEquipmentPhoto } from '@/services/equipment';

interface EquipmentPhoto {
  id: string;
  photo_url: string;
  caption?: string;
  is_primary: boolean;
  upvotes: number;
  downvotes: number;
  score: number;
  user_vote?: 'upvote' | 'downvote' | null;
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
  const [sortBy, setSortBy] = useState<'score' | 'newest' | 'oldest'>('score');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhoto, setSelectedPhoto] = useState<EquipmentPhoto | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [equipmentId, sortBy]);

  const loadPhotos = async () => {
    try {
      let query = supabase
        .from('equipment_photos_with_votes')
        .select(`
          *,
          user:profiles!equipment_photos_user_id_fkey (
            username,
            avatar_url
          )
        `)
        .eq('equipment_id', equipmentId);

      // Apply sorting
      switch (sortBy) {
        case 'score':
          query = query.order('score', { ascending: false });
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
      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (photoId: string, voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast.error('Please sign in to vote');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('toggle_photo_vote', {
        p_photo_id: photoId,
        p_vote_type: voteType
      });

      if (error) throw error;

      // Reload photos to get updated counts
      loadPhotos();
      
      const action = data.action;
      if (action === 'created') {
        toast.success(`Photo ${voteType}d!`);
      } else if (action === 'removed') {
        toast.success('Vote removed');
      } else if (action === 'changed') {
        toast.success('Vote changed');
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };


  const PhotoCard = ({ photo }: { photo: EquipmentPhoto }) => {
    const isUpvoted = photo.user_vote === 'upvote';
    const isDownvoted = photo.user_vote === 'downvote';

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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isUpvoted ? "default" : "outline"}
                onClick={() => handleVote(photo.id, 'upvote')}
                className="h-8"
              >
                <ThumbsUp className="w-3 h-3 mr-1" />
                {photo.upvotes}
              </Button>
              <Button
                size="sm"
                variant={isDownvoted ? "destructive" : "outline"}
                onClick={() => handleVote(photo.id, 'downvote')}
                className="h-8"
              >
                <ThumbsDown className="w-3 h-3 mr-1" />
                {photo.downvotes}
              </Button>
            </div>
            <span className={`text-sm font-medium ${
              photo.score > 0 ? 'text-green-600' : 
              photo.score < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {photo.score > 0 ? '+' : ''}{photo.score}
            </span>
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
              <SelectItem value="score">Top Rated</SelectItem>
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(selectedPhoto.photo_url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Original
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = selectedPhoto.photo_url;
                    a.download = `${brand}-${model}-${selectedPhoto.id}.jpg`;
                    a.click();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}


      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
            <DialogDescription>
              Add a photo of the {equipmentName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <Label htmlFor="photo">Select Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && user) {
                    try {
                      await uploadEquipmentPhoto(
                        user.id,
                        equipmentId,
                        file,
                        '',
                        photos.length === 0
                      );
                      toast.success('Photo uploaded successfully!');
                      setShowUploadDialog(false);
                      loadPhotos();
                    } catch (error) {
                      console.error('Upload error:', error);
                      toast.error('Failed to upload photo');
                    }
                  }
                }}
              />
              <p className="text-sm text-muted-foreground mt-1">
                JPG, PNG up to 10MB
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}