import { useState, useEffect } from "react";
import { Grid, List, Heart, Trash, Loader2, Image, Star, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { getUserSavedEquipment, toggleEquipmentSave, getUserWishlist } from "@/services/equipment";
import { getUserSavedPhotos, unsavePhoto, togglePhotoFavorite } from "@/services/savedPhotos";
import { useAuth } from "@/contexts/AuthContext";
import { formatCompactCurrency, formatCompactNumber } from "@/lib/formatters";
import type { SavedPhoto } from "@/services/savedPhotos";

const Saved = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'in-bag' | 'wishlist'>('all');
  const [savedEquipment, setSavedEquipment] = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [savedPhotos, setSavedPhotos] = useState<SavedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [photoFilter, setPhotoFilter] = useState<'all' | 'favorited'>('all');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [savedData, wishlistData, photosData] = await Promise.all([
        getUserSavedEquipment(user.id),
        getUserWishlist(user.id),
        getUserSavedPhotos(user.id)
      ]);

      // Map the saved data to extract the equipment objects
      const mappedSavedData = (savedData || []).map(item => {
        if (!item.equipment) return null;
        // Extract equipment data and add primaryPhoto
        const equipment = item.equipment;
        const primaryPhoto = equipment.equipment_photos?.find(p => p.is_primary)?.photo_url || 
                           equipment.equipment_photos?.[0]?.photo_url ||
                           equipment.image_url;
        return {
          ...equipment,
          primaryPhoto,
          saved_at: item.created_at
        };
      }).filter(Boolean);
      
      setSavedEquipment(mappedSavedData);
      setWishlistItems(wishlistData || []);
      setSavedPhotos(photosData || []);
    } catch (error) {
      console.error('Error fetching saved items:', error);
      toast({
        title: "Error",
        description: "Failed to load saved items. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSave = async (equipmentId: string) => {
    if (!user) return;
    
    setRemovingIds(prev => new Set(prev).add(equipmentId));
    try {
      await toggleEquipmentSave(user.id, equipmentId);
      setSavedEquipment(prev => prev.filter(item => item.id !== equipmentId));
      toast({
        title: "Removed",
        description: "Equipment removed from saved items."
      });
    } catch (error) {
      console.error('Error removing save:', error);
      toast({
        title: "Error",
        description: "Failed to remove item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRemovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(equipmentId);
        return newSet;
      });
    }
  };

  const handleUnsavePhoto = async (photoId: string, photoUrl: string) => {
    if (!user) return;
    
    setRemovingIds(prev => new Set(prev).add(photoId));
    try {
      await unsavePhoto(user.id, photoUrl);
      setSavedPhotos(prev => prev.filter(photo => photo.id !== photoId));
      toast({
        title: "Removed",
        description: "Photo removed from saved items."
      });
    } catch (error) {
      console.error('Error unsaving photo:', error);
      toast({
        title: "Error",
        description: "Failed to remove photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRemovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  const handleToggleFavorite = async (photoId: string) => {
    if (!user) return;
    
    try {
      const updatedPhoto = await togglePhotoFavorite(user.id, photoId);
      setSavedPhotos(prev => prev.map(photo => 
        photo.id === photoId ? { ...photo, is_favorited: !photo.is_favorited } : photo
      ));
      toast({
        title: updatedPhoto.is_favorited ? "Favorited" : "Unfavorited",
        description: `Photo ${updatedPhoto.is_favorited ? 'added to' : 'removed from'} favorites.`
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite status.",
        variant: "destructive"
      });
    }
  };

  const allItems = [...savedEquipment, ...wishlistItems.map(item => ({ 
    ...item.equipment, 
    isWishlist: true,
    wishlistPriority: item.priority,
    wishlistNotes: item.notes
  }))];

  const inBagCount = 0; // TODO: Implement checking if equipment is in user's bag
  const wishlistCount = wishlistItems.length;

  const filteredEquipment = allItems.filter(item => {
    if (filter === 'in-bag') return false; // TODO: Implement in-bag check
    if (filter === 'wishlist') return item.isWishlist;
    return true;
  });

  const filteredPhotos = savedPhotos.filter(photo => {
    if (photoFilter === 'favorited') return photo.is_favorited;
    return true;
  });

  const SavedEquipmentGrid = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (filteredEquipment.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {filter === 'wishlist' ? 'No items in your wishlist' : 'No saved equipment'}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/equipment')}
          >
            Browse Equipment
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredEquipment.map(item => (
          <Card key={item.id} className="hover:shadow-card transition-shadow duration-200">
            <CardContent className="p-0">
              <Link to={`/equipment/${item.id}`}>
                <div className="aspect-square bg-background p-4 relative">
                  <img 
                    src={item.primaryPhoto || '/placeholder.svg'} 
                    alt={`${item.brand} ${item.model}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  {item.isWishlist && (
                    <div className="absolute top-2 right-2 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded">
                      Wishlist
                    </div>
                  )}
                </div>
              </Link>
              
              <div className="p-3">
                <h3 className="font-medium text-sm">{item.brand}</h3>
                <p className="text-muted-foreground text-sm">{item.model}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-bold">{item.msrp ? formatCompactCurrency(item.msrp) : 'N/A'}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive p-1"
                    onClick={() => handleRemoveSave(item.id)}
                    disabled={removingIds.has(item.id)}
                  >
                    {removingIds.has(item.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart className="w-4 h-4 fill-current" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const SavedEquipmentList = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-20 h-20" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-9 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (filteredEquipment.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {filter === 'wishlist' ? 'No items in your wishlist' : 'No saved equipment'}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/equipment')}
          >
            Browse Equipment
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredEquipment.map(item => (
          <Card key={item.id} className="hover:shadow-card transition-shadow duration-200">
            <CardContent className="p-4 flex items-center gap-4">
              <Link to={`/equipment/${item.id}`}>
                <img 
                  src={item.primaryPhoto || '/placeholder.svg'}
                  alt={`${item.brand} ${item.model}`}
                  className="w-20 h-20 object-contain"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </Link>
              
              <div className="flex-1">
                <Link to={`/equipment/${item.id}`}>
                  <h3 className="font-medium hover:text-primary transition-colors">
                    {item.brand} {item.model}
                  </h3>
                </Link>
                <p className="text-muted-foreground text-sm capitalize">
                  {item.category?.replace(/-/g, ' ')} 
                  {item.created_at && ` • Saved ${new Date(item.created_at).toLocaleDateString()}`}
                  {item.isWishlist && ` • ${item.wishlistPriority || 'Normal'} priority`}
                </p>
                <div className="flex gap-4 mt-1 text-sm">
                  <span className="font-bold">{item.msrp ? formatCompactCurrency(item.msrp) : 'N/A'}</span>
                  {item.isWishlist && item.wishlistNotes && (
                    <span className="text-muted-foreground italic">{item.wishlistNotes}</span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/equipment/${item.id}`)}
                >
                  View
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveSave(item.id)}
                  disabled={removingIds.has(item.id)}
                >
                  {removingIds.has(item.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };


  const SavedPhotosGrid = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square" />
            </Card>
          ))}
        </div>
      );
    }

    if (filteredPhotos.length === 0) {
      return (
        <div className="text-center py-12">
          <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            {photoFilter === 'favorited' ? 'No favorited photos' : 'No saved photos yet'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Save photos from equipment showcases to use for your own equipment
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/equipment')}
          >
            Browse Equipment
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredPhotos.map(photo => (
          <Card key={photo.id} className="group relative overflow-hidden hover:shadow-card transition-all duration-200">
            <div className="aspect-square relative bg-background">
              <img 
                src={photo.photo_url} 
                alt={`${photo.equipment_brand} ${photo.equipment_model}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0"
                    onClick={() => handleToggleFavorite(photo.id)}
                  >
                    <Star className={`w-4 h-4 ${photo.is_favorited ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0"
                    onClick={() => handleUnsavePhoto(photo.id, photo.photo_url)}
                    disabled={removingIds.has(photo.id)}
                  >
                    {removingIds.has(photo.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <p className="font-medium text-sm truncate">
                    {photo.equipment_brand} {photo.equipment_model}
                  </p>
                  {photo.saved_from_username && (
                    <p className="text-xs text-white/80 truncate">
                      from @{photo.saved_from_username}
                    </p>
                  )}
                  {photo.user_notes && (
                    <p className="text-xs text-white/60 truncate mt-1">
                      {photo.user_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6 text-center">
              {loading ? (
                <Skeleton className="h-10 w-16 mx-auto mb-2" />
              ) : (
                <p className="text-3xl font-bold text-primary">{allItems.length}</p>
              )}
              <p className="text-muted-foreground">Equipment</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              {loading ? (
                <Skeleton className="h-10 w-16 mx-auto mb-2" />
              ) : (
                <p className="text-3xl font-bold text-primary">{savedPhotos.length}</p>
              )}
              <p className="text-muted-foreground">Photos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              {loading ? (
                <Skeleton className="h-10 w-16 mx-auto mb-2" />
              ) : (
                <p className="text-3xl font-bold text-primary">{wishlistCount}</p>
              )}
              <p className="text-muted-foreground">Wishlist</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="equipment" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="equipment">Saved Equipment</TabsTrigger>
            <TabsTrigger value="photos">Saved Photos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="equipment">
            {/* Equipment Filters */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All Saved ({allItems.length})
                </Button>
                <Button
                  variant={filter === 'in-bag' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('in-bag')}
                  disabled
                >
                  In My Bag (0)
                </Button>
                <Button
                  variant={filter === 'wishlist' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('wishlist')}
                >
                  Wishlist ({wishlistCount})
                </Button>
              </div>

              {/* View Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={view === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={view === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Saved Equipment Grid/List */}
            {view === 'grid' ? <SavedEquipmentGrid /> : <SavedEquipmentList />}
          </TabsContent>


          <TabsContent value="photos">
            {/* Photos Filters */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <Button
                  variant={photoFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPhotoFilter('all')}
                >
                  All Photos ({savedPhotos.length})
                </Button>
                <Button
                  variant={photoFilter === 'favorited' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPhotoFilter('favorited')}
                >
                  Favorited ({savedPhotos.filter(p => p.is_favorited).length})
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <Image className="w-4 h-4 inline mr-1" />
                {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
              </div>
            </div>

            <SavedPhotosGrid />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Saved;