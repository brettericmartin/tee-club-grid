import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingCart, Share2, Users } from 'lucide-react';
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
import ReviewList from '@/components/equipment/ReviewList';
import { getTopBagsWithEquipment } from '@/services/equipmentBags';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TeedBallIcon } from '@/components/shared/TeedBallLike';
import PriceComparison from '@/components/equipment/PriceComparison';

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
      loadEquipment();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadForumThreads();
      loadTopBags();
    }
  }, [id]);

  const loadEquipment = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getEquipmentDetails(id);
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
    if (!id) return;
    
    setLoadingBags(true);
    try {
      const bags = await getTopBagsWithEquipment(id);
      setTopBags(bags);
    } catch (error) {
      console.error('Error loading top bags:', error);
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
                {equipment.most_liked_photo || equipment.primaryPhoto || equipment.image_url ? (
                  <img
                    src={equipment.most_liked_photo || equipment.primaryPhoto || equipment.image_url}
                    alt={`${equipment.brand} ${equipment.model}`}
                    className="w-full h-96 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        // Create React elements instead of using innerHTML
                        const fallbackDiv = document.createElement('div');
                        fallbackDiv.className = 'w-full h-96 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg';
                        const fallbackSpan = document.createElement('span');
                        fallbackSpan.className = 'text-white font-bold text-4xl';
                        fallbackSpan.textContent = equipment.brand?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'NA';
                        fallbackDiv.appendChild(fallbackSpan);
                        parent.appendChild(fallbackDiv);
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg">
                    <span className="text-white font-bold text-4xl">
                      {equipment.brand?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                )}
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

            {/* Price */}
            <div>
              <p className="text-3xl font-bold">
                ${equipment.msrp || equipment.lowestPrice || 'N/A'}
              </p>
              {equipment.lowestPrice && equipment.lowestPrice < equipment.msrp && (
                <p className="text-sm text-green-600">
                  Lowest price found: ${equipment.lowestPrice}
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
                  {equipment.averageRating.toFixed(1)} ({equipment.reviewCount} reviews)
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
                <ShoppingCart className="w-4 h-4 mr-2" />
                Find Prices
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
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="specs">Specs</TabsTrigger>
            <TabsTrigger value="bags">
              <Users className="w-4 h-4 mr-2" />
              Bags
            </TabsTrigger>
            <TabsTrigger value="forums">Forums</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="prices">Prices</TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="mt-6">
            <EquipmentPhotoRepository
              equipmentId={equipment.id}
              equipmentName={`${equipment.brand} ${equipment.model}`}
              brand={equipment.brand}
              model={equipment.model}
            />
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
                          className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                          onClick={() => navigate(`/bag/${bag.bagId}`)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={bag.user.avatar} />
                              <AvatarFallback>
                                {bag.user.displayName?.charAt(0) || bag.user.username?.charAt(0)?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{bag.bagName}</p>
                              <p className="text-sm text-muted-foreground">
                                @{bag.user.username} • Handicap {bag.user.handicap ?? 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <TeedBallIcon className="w-4 h-4" filled={false} />
                            <span className="text-sm">{bag.likesCount}</span>
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

          <TabsContent value="reviews" className="mt-6">
            <ReviewList equipmentId={id} />
          </TabsContent>

          <TabsContent value="prices" className="mt-6">
            <PriceComparison 
              equipmentId={equipment.id}
              equipmentName={`${equipment.brand} ${equipment.model}`}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}