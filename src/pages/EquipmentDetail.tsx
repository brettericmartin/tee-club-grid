import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getEquipmentDetails, toggleEquipmentSave, isEquipmentSaved } from '@/services/equipment';
import { EquipmentPhotoRepository } from '@/components/equipment/EquipmentPhotoRepository';
import EquipmentSpecs from '@/components/equipment-detail/EquipmentSpecs';
import { toast } from 'sonner';
import { getForumThreadsByEquipment } from '@/services/forum';
import ForumThreadPreview from '@/components/forum/ForumThreadPreview';
import { MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getTopBagsWithEquipment } from '@/services/equipmentBags';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TeedBallIcon } from '@/components/shared/TeedBallLike';
import EquipmentVideosPanel from '@/components/equipment/EquipmentVideosPanel';
import { EquipmentImage } from '@/components/shared/EquipmentImage';

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [loadingForums, setLoadingForums] = useState(false);
  const [topBags, setTopBags] = useState<any[]>([]);
  const [loadingBags, setLoadingBags] = useState(false);

  useEffect(() => {
    if (id) {
      // Clear previous state when ID changes
      setEquipment(null);
      setTopBags([]);
      setForumThreads([]);
      setIsSaved(false);
      
      loadEquipment();
    }
  }, [id]);

  useEffect(() => {
    // Only load related data if equipment exists and has loaded
    if (id && equipment) {
      loadForumThreads();
      loadTopBags();
    }
  }, [id, equipment]);

  const loadEquipment = async () => {
    if (!id) return;

    try {
      setLoading(true);
      console.log('[EquipmentDetail] Loading equipment with ID:', id);
      const data = await getEquipmentDetails(id);
      
      // Check if equipment exists
      if (!data || !data.id) {
        console.warn('[EquipmentDetail] Equipment not found with ID:', id);
        toast.error('Equipment not found');
        navigate('/equipment');
        return;
      }
      
      console.log('[EquipmentDetail] Equipment data received:', {
        brand: data.brand,
        model: data.model,
        primaryPhoto: data.primaryPhoto || 'MISSING',
        most_liked_photo: data.most_liked_photo || 'MISSING',
        image_url: data.image_url || 'MISSING',
        equipment_photos_count: data.equipment_photos?.length || 0,
        photoCount: data.photoCount
      });
      console.log('[EquipmentDetail] Full equipment_photos array:', data.equipment_photos);
      console.log('[EquipmentDetail] About to set equipment state with primaryPhoto:', data.primaryPhoto);
      setEquipment(data);
      
      // Check if user has saved this equipment (non-blocking)
      if (user && id) {
        isEquipmentSaved(user.id, id).then(saved => {
          setIsSaved(saved);
        }).catch(error => {
          console.error('Error checking saved status:', error);
          // Don't show error - saved status is optional
        });
      }
    } catch (error) {
      console.error('Error loading equipment:', error);
      toast.error('Failed to load equipment details');
      setEquipment(null); // Clear equipment on error
    } finally {
      setLoading(false);
    }
  };

  const loadForumThreads = async () => {
    if (!id) return;
    
    setLoadingForums(true);
    try {
      const { threads } = await getForumThreadsByEquipment(id);
      setForumThreads(threads);
    } catch (error) {
      console.error('Error loading forum threads:', error);
    } finally {
      setLoadingForums(false);
    }
  };

  const loadTopBags = async () => {
    if (!id || !equipment) return;
    
    setLoadingBags(true);
    try {
      const bags = await getTopBagsWithEquipment(id);
      setTopBags(bags || []);
    } catch (error) {
      console.error('Error loading top bags:', error);
      setTopBags([]); // Clear on error
    } finally {
      setLoadingBags(false);
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      toast.info('Please sign in to save equipment to your favorites');
      return;
    }

    if (!id) {
      toast.error('Equipment ID not found');
      return;
    }

    try {
      const saved = await toggleEquipmentSave(user.id, id);
      setIsSaved(saved);
      toast.success(saved ? 'Equipment saved!' : 'Equipment removed from saved');
    } catch (error: any) {
      console.error('Save equipment error:', error);
      const errorMessage = error.message || 'Failed to save equipment';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-24" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Equipment not found</h2>
          <Button onClick={() => navigate('/equipment')}>
            Back to Equipment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Primary Image */}
          <div>
            <Card>
              <CardContent className="p-0">
                <EquipmentImage
                  src={equipment.primaryPhoto || equipment.most_liked_photo || equipment.image_url}
                  alt={`${equipment.brand} ${equipment.model}`}
                  className="w-full h-96 object-cover rounded-lg"
                  fallbackText={equipment.brand?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Equipment Info */}
          <div className="space-y-6">
            <div>
              <Badge className="mb-2">{equipment.category}</Badge>
              <h1 className="text-3xl font-bold mb-2">
                {equipment.brand} {equipment.model}
              </h1>
              {equipment.release_date && (
                <p className="text-muted-foreground">
                  Released: {new Date(equipment.release_date).getFullYear()}
                </p>
              )}
            </div>

            {/* Ratings */}
            {equipment.averageRating && (
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${
                        star <= equipment.averageRating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {equipment.averageRating.toFixed(1)}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleSaveToggle} variant={isSaved ? 'secondary' : 'default'}>
                <Heart className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="photos" className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="flex w-max min-w-full lg:w-auto">
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="specs">Specs</TabsTrigger>
              <TabsTrigger value="bags">
                <Users className="w-4 h-4 mr-2" />
                Bags
              </TabsTrigger>
              <TabsTrigger value="forums">Forums</TabsTrigger>
              <TabsTrigger value="videos">
                <Video className="w-4 h-4 mr-2" />
                Videos
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="photos" className="mt-6">
            {equipment && equipment.id ? (
              <EquipmentPhotoRepository
                equipmentId={equipment.id}
                equipmentName={`${equipment.brand} ${equipment.model}`}
                brand={equipment.brand}
                model={equipment.model}
              />
            ) : (
              <div>Loading equipment data...</div>
            )}
          </TabsContent>

          <TabsContent value="specs" className="mt-6">
            <EquipmentSpecs 
              equipment={equipment}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="bags" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Bags Using This Equipment</h3>
                <ScrollArea className="h-[500px]">
                  {loadingBags ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading bags...</p>
                    </div>
                  ) : topBags.length > 0 ? (
                    <div className="space-y-3">
                      {topBags.map((bag) => (
                        <div
                          key={bag.bagId}
                          className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-white/10 rounded-lg hover:bg-[#2a2a2a] hover:border-white/20 transition-all cursor-pointer"
                          onClick={() => navigate(`/bag/${bag.bagId}`)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-white/10">
                              <AvatarImage src={bag.user.avatar} />
                              <AvatarFallback className="bg-[#2a2a2a] text-white">
                                {bag.user.displayName?.charAt(0) || bag.user.username?.charAt(0)?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-white">{bag.bagName}</p>
                              <p className="text-sm text-gray-400">
                                @{bag.user.username} • Handicap {bag.user.handicap ?? 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <TeedBallIcon className="w-4 h-4" filled={false} />
                            <span className="text-sm font-medium">{bag.likesCount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No bags found with this equipment</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Be the first to add this to your bag
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => navigate('/my-bag')}
                      >
                        Go to My Bag
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forums" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Community Discussions</h3>
                <ScrollArea className="h-[500px]">
                  {loadingForums ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading discussions...</p>
                    </div>
                  ) : forumThreads.length > 0 ? (
                    <div className="space-y-2">
                      {forumThreads.map((thread) => (
                        <ForumThreadPreview
                          key={thread.id}
                          thread={{
                            ...thread,
                            tee_count: thread.tee_count || 0,
                            reply_count: thread.reply_count || 0
                          }}
                          onClick={() => {
                            navigate(`/forum/${thread.category.slug}/${thread.id}`);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No discussions yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Be the first to start a conversation about this equipment
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => navigate('/forum')}
                      >
                        Start Discussion
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="videos" className="mt-6">
            <EquipmentVideosPanel
              equipmentId={equipment.id}
              equipmentName={`${equipment.brand} ${equipment.model}`}
              canAdd={true}
            />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}