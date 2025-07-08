import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingCart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getEquipmentDetails, toggleEquipmentSave } from '@/services/equipment';
import { EquipmentPhotoRepository } from '@/components/equipment/EquipmentPhotoRepository';
import { toast } from 'sonner';

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (id) {
      loadEquipment();
    }
  }, [id]);

  const loadEquipment = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getEquipmentDetails(id);
      setEquipment(data);
      
      // Check if user has saved this equipment
      if (user) {
        // You'd need to add this check to your service
        // setIsSaved(await isEquipmentSaved(user.id, id));
      }
    } catch (error) {
      console.error('Error loading equipment:', error);
      toast.error('Failed to load equipment details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      toast.error('Please sign in to save equipment');
      return;
    }

    try {
      const saved = await toggleEquipmentSave(user.id, id!);
      setIsSaved(saved);
      toast.success(saved ? 'Equipment saved!' : 'Equipment removed from saved');
    } catch (error) {
      toast.error('Failed to save equipment');
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
                <img
                  src={equipment.primaryPhoto || equipment.image_url || '/placeholder.svg'}
                  alt={`${equipment.brand} ${equipment.model}`}
                  className="w-full h-96 object-cover rounded-lg"
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

            {/* Specs Preview */}
            {equipment.specs && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Key Specifications</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(equipment.specs).slice(0, 6).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="photos" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
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
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Full Specifications</h3>
                {equipment.specs ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(equipment.specs).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No specifications available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-4">
              {equipment.equipment_reviews?.map((review: any) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{review.profile?.username}</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.title && (
                      <h4 className="font-semibold mb-2">{review.title}</h4>
                    )}
                    <p className="text-sm">{review.content}</p>
                  </CardContent>
                </Card>
              )) || (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No reviews yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="prices" className="mt-6">
            <div className="space-y-4">
              {equipment.equipment_prices?.map((price: any) => (
                <Card key={price.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{price.retailer}</p>
                        <p className="text-2xl font-bold">
                          ${price.sale_price || price.price}
                        </p>
                        {price.sale_price && price.sale_price < price.price && (
                          <p className="text-sm text-green-600">
                            Save ${(price.price - price.sale_price).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={price.in_stock ? 'default' : 'secondary'}>
                          {price.in_stock ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                        {price.url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => window.open(price.url, '_blank')}
                          >
                            View Deal
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) || (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No pricing information available</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}