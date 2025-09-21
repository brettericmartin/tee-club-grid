import React, { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, X, Image, MessageSquare, Users, ExternalLink, Video, Star, StarOff, Camera, Edit3, Images, Check, ChevronsUpDown, Crop, Trash2, Info, Heart, Expand } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { listLinksForBagEquipment } from '@/services/userEquipmentLinks';
// Removed SimpleAffiliateLinks import - using inline implementation
import { EquipmentVideosPanel } from '@/components/equipment/EquipmentVideosPanel';
import { CommunityPhotosGallery } from './CommunityPhotosGallery';
import { ImageCropper } from '@/components/ImageCropper';
import { UnifiedPhotoUploadDialog } from '@/components/shared/UnifiedPhotoUploadDialog';
import { PhotoLightbox } from '@/components/shared/PhotoLightbox';
import { TeedBallLike } from '@/components/shared/TeedBallLike';
import { syncUserPhotoToEquipment } from '@/services/equipmentPhotoSync';
import { supabase } from '@/lib/supabase';
import { togglePhotoTee } from '@/services/teeService';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/supabase';

type Equipment = Database['public']['Tables']['equipment']['Row'];
type BagEquipment = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Equipment;
  shaft?: Equipment;
  grip?: Equipment;
};

interface BagEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bagId: string;
  bagEquipmentId: string;
  bagEquipment: BagEquipment;
  canEdit?: boolean;
  onUpdate?: () => void;
}

export function BagEquipmentModal({
  isOpen,
  onClose,
  bagId,
  bagEquipmentId,
  bagEquipment,
  canEdit = false,
  onUpdate
}: BagEquipmentModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [equipmentPhotos, setEquipmentPhotos] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  
  // Photo lightbox state
  const [showLightbox, setShowLightbox] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  
  // Shaft and grip options
  const [shafts, setShafts] = useState<Equipment[]>([]);
  const [grips, setGrips] = useState<Equipment[]>([]);
  
  // Photo management states
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropperImage, setCropperImage] = useState<string>('');
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  
  // Searchable dropdown states
  const [shaftOpen, setShaftOpen] = useState(false);
  const [gripOpen, setGripOpen] = useState(false);
  const [showCustomLoft, setShowCustomLoft] = useState(false);
  
  const equipment = bagEquipment?.equipment;
  const equipmentId = equipment?.id;
  
  // Loft options by club type
  const LOFT_OPTIONS: Record<string, string[]> = {
    driver: ['8°', '8.5°', '9°', '9.5°', '10°', '10.5°', '11°', '11.5°', '12°', '12.5°'],
    drivers: ['8°', '8.5°', '9°', '9.5°', '10°', '10.5°', '11°', '11.5°', '12°', '12.5°'], // Plural alias
    fairway_wood: ['13°', '13.5°', '14°', '15°', '15.5°', '16°', '16.5°', '17°', '17.5°', '18°', '18.5°', '19°', '19.5°', '20°', '21°', '22°', '23°'],
    fairway_woods: ['13°', '13.5°', '14°', '15°', '15.5°', '16°', '16.5°', '17°', '17.5°', '18°', '18.5°', '19°', '19.5°', '20°', '21°', '22°', '23°'], // Plural alias
    wood: ['13°', '13.5°', '14°', '15°', '15.5°', '16°', '16.5°', '17°', '17.5°', '18°', '18.5°', '19°', '19.5°', '20°', '21°', '22°', '23°'],
    woods: ['13°', '13.5°', '14°', '15.5°', '16°', '16.5°', '17°', '17.5°', '18°', '18.5°', '19°', '19.5°', '20°', '21°', '22°', '23°'],
    hybrid: ['16°', '17°', '18°', '19°', '20°', '21°', '22°', '23°', '24°', '25°', '26°', '27°'],
    hybrids: ['16°', '17°', '18°', '19°', '20°', '21°', '22°', '23°', '24°', '25°', '26°', '27°'], // Plural alias
    utility_iron: ['16°', '17°', '18°', '19°', '20°', '21°', '22°', '23°', '24°'], // Utility irons
    wedge: ['46°', '48°', '50°', '52°', '54°', '56°', '58°', '60°', '62°', '64°'],
    wedges: ['46°', '48°', '50°', '52°', '54°', '56°', '58°', '60°', '62°', '64°'],
    putter: ['1°', '2°', '3°', '4°', '5°', '6°', '7°'], // Putter loft options
    putters: ['1°', '2°', '3°', '4°', '5°', '6°', '7°'] // Plural alias
  };
  
  // Iron configuration options
  const IRON_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'PW', 'AW', 'GW', 'SW', 'LW'];
  const getIronIndex = (iron: string) => IRON_OPTIONS.indexOf(iron);
  
  // Check if equipment is a club
  const isClub = equipment && ['driver', 'drivers', 'fairway_wood', 'fairway_woods', 'wood', 'woods', 'hybrid', 'hybrids', 'utility_iron', 
                  'iron', 'irons', 'wedge', 'wedges', 'putter', 'putters'].includes(equipment.category);
  
  // Check if equipment is an iron
  const isIron = equipment && (['iron', 'irons'].includes(equipment.category) || 
                 equipment.model.toLowerCase().includes('iron set'));
  
  // Edit form state
  const [formData, setFormData] = useState({
    loft: bagEquipment?.custom_specs?.loft || '',
    shaft_id: bagEquipment?.shaft_id || '',
    grip_id: bagEquipment?.grip_id || '',
    notes: bagEquipment?.notes || '',
    is_featured: bagEquipment?.is_featured || false,
    custom_photo_url: bagEquipment?.custom_photo_url || '',
    condition: bagEquipment?.condition || 'new',
    purchase_price: bagEquipment?.purchase_price?.toString() || '',
    purchase_date: bagEquipment?.purchase_date || '',
    iron_config_type: bagEquipment?.custom_specs?.iron_config?.type || 'set',
    iron_from: bagEquipment?.custom_specs?.iron_config?.from || '5',
    iron_to: bagEquipment?.custom_specs?.iron_config?.to || 'PW',
    iron_single: bagEquipment?.custom_specs?.iron_config?.single || '3'
  });

  // Fetch affiliate links
  const { data: linksResponse } = useQuery({
    queryKey: ['links', bagEquipmentId],
    queryFn: () => listLinksForBagEquipment(bagEquipmentId),
    enabled: !!bagEquipmentId
  });

  const links = linksResponse?.data || [];

  // Load additional data when modal opens
  useEffect(() => {
    if (isOpen && equipmentId) {
      loadAdditionalData();
      loadOptions();
    }
  }, [isOpen, equipmentId]);
  
  const loadOptions = async () => {
    try {
      // Load shafts
      const { data: shaftData } = await supabase
        .from('equipment')
        .select('*')
        .eq('category', 'shaft')
        .order('brand')
        .order('model');
      
      if (shaftData) setShafts(shaftData);

      // Load grips
      const { data: gripData } = await supabase
        .from('equipment')
        .select('*')
        .eq('category', 'grip')
        .order('brand')
        .order('model');
      
      if (gripData) setGrips(gripData);
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const handleSave = useCallback(async () => {
    if (!canEdit) return;
    
    setLoading(true);
    try {
      const customSpecs: any = bagEquipment?.custom_specs || {};
      if (formData.loft) {
        customSpecs.loft = formData.loft;
      } else {
        delete customSpecs.loft;
      }
      
      // Add iron configuration if applicable
      if (isIron) {
        customSpecs.iron_config = {
          type: formData.iron_config_type,
          ...(formData.iron_config_type === 'set' 
            ? { from: formData.iron_from, to: formData.iron_to }
            : { single: formData.iron_single })
        };
      }
      
      const updateData: any = {
        shaft_id: formData.shaft_id || null,
        grip_id: formData.grip_id || null,
        custom_specs: Object.keys(customSpecs).length > 0 ? customSpecs : null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        purchase_date: formData.purchase_date || null,
        condition: formData.condition,
        notes: formData.notes || null,
        is_featured: formData.is_featured,
        custom_photo_url: formData.custom_photo_url || null,
      };

      const { error } = await supabase
        .from('bag_equipment')
        .update(updateData)
        .eq('id', bagEquipmentId);

      if (error) throw error;
      
      // Sync custom photo to equipment_photos if it was updated
      if (formData.custom_photo_url && formData.custom_photo_url !== bagEquipment?.custom_photo_url) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const syncResult = await syncUserPhotoToEquipment(
              user.id,
              equipmentId,
              formData.custom_photo_url,
              `Custom photo of ${equipment.brand} ${equipment.model}`
            );
            if (!syncResult.success) {
              console.error('Failed to sync photo to equipment gallery:', syncResult.error);
            }
          }
        } catch (syncError) {
          console.error('Error syncing photo to equipment gallery:', syncError);
        }
      }

      toast.success('Equipment updated successfully');
      setIsEditing(false);
      
      // Invalidate queries and call onUpdate
      queryClient.invalidateQueries({ queryKey: ['bag-equipment', bagId] });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast.error('Failed to update equipment');
    } finally {
      setLoading(false);
    }
  }, [canEdit, bagEquipment, isIron, formData, bagEquipmentId, equipmentId, equipment, queryClient, bagId, onUpdate]);
  
  const handleRemove = useCallback(async () => {
    if (!confirm(`Are you sure you want to remove ${equipment.brand} ${equipment.model} from your bag?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bag_equipment')
        .delete()
        .eq('id', bagEquipmentId);

      if (error) throw error;

      toast.success('Equipment removed from bag');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error removing equipment:', error);
      toast.error('Failed to remove equipment');
    } finally {
      setLoading(false);
    }
  }, [equipment, bagEquipmentId, onUpdate, onClose]);

  const loadAdditionalData = useCallback(async () => {
    if (!equipmentId) return;

    try {
      // Load equipment photos from equipment_photos table
      const { data: photos } = await supabase
        .from('equipment_photos')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('likes_count', { ascending: false })
        .limit(20);
      
      // If user is logged in, check which photos they've liked
      let photosWithLikes = photos || [];
      if (user && photos) {
        const { data: userLikes } = await supabase
          .from('equipment_photo_likes')
          .select('photo_id')
          .eq('user_id', user.id)
          .in('photo_id', photos.map(p => p.id));

        const likedPhotoIds = new Set(userLikes?.map(l => l.photo_id) || []);
        photosWithLikes = photos.map(photo => ({
          ...photo,
          is_liked_by_user: likedPhotoIds.has(photo.id)
        }));
      }
      
      // Combine user photos with equipment's main photo
      const allPhotos = [];
      
      // Add the custom photo if it exists (and it's not a placeholder)
      if (bagEquipment?.custom_photo_url && 
          !bagEquipment.custom_photo_url.includes('placehold')) {
        allPhotos.push({
          id: 'custom-photo',
          photo_url: bagEquipment.custom_photo_url,
          equipment_id: equipmentId,
          is_primary: true,
          likes_count: 0,
          is_liked_by_user: false
        });
      }
      
      // Add the equipment's main photo if it exists and is different (and not a placeholder)
      const mainPhoto = equipment?.image_url;
      if (mainPhoto && 
          mainPhoto !== bagEquipment?.custom_photo_url && 
          !mainPhoto.includes('placehold')) {
        allPhotos.push({
          id: 'main-photo',
          photo_url: mainPhoto,
          equipment_id: equipmentId,
          is_primary: !bagEquipment?.custom_photo_url,
          likes_count: 0,
          is_liked_by_user: false
        });
      }
      
      // Add community photos (filter out placeholders)
      if (photosWithLikes) {
        const validPhotos = photosWithLikes.filter(photo => 
          photo.photo_url && !photo.photo_url.includes('placehold')
        );
        allPhotos.push(...validPhotos);
      }
      
      setEquipmentPhotos(allPhotos);

      // Load reviews (placeholder - adjust based on your schema)
      const { data: reviewsData } = await supabase
        .from('equipment_reviews')
        .select('*, profiles!user_id(username, display_name, avatar_url)')
        .eq('equipment_id', equipmentId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (reviewsData) setReviews(reviewsData);

      // Load forum threads mentioning this equipment
      const { data: threads } = await supabase
        .from('forum_threads')
        .select('*')
        .or(`title.ilike.%${equipment?.model}%,content.ilike.%${equipment?.model}%`)
        .limit(5);
      
      if (threads) setForumThreads(threads);
    } catch (error) {
      console.error('Error loading additional data:', error);
    }
  }, [equipmentId, equipment, bagEquipment, user]);

  const handlePhotoLike = useCallback(async (photoId: string, isLiked: boolean) => {
    if (!user) {
      toast.error('Please sign in to like photos');
      return;
    }

    // Skip likes for custom/main photos
    if (photoId === 'custom-photo' || photoId === 'main-photo') {
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
      setEquipmentPhotos(equipmentPhotos.map(photo => 
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
  }, [user, equipmentPhotos]);

  if (!equipment) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:w-full max-w-4xl h-[calc(100vh-4rem)] sm:h-auto max-h-[calc(100vh-4rem)] sm:max-h-[85vh] p-0 overflow-hidden flex flex-col"
        hideCloseButton={true}>
        {/* Header - Simplified for mobile */}
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4 border-b">
          <div className="space-y-2">
            {/* Title and Edit Button Row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <DialogTitle className="text-base sm:text-xl font-semibold">
                  My {equipment.brand} {equipment.model}
                </DialogTitle>
                {formData.is_featured && (
                  <Badge variant="default" className="bg-yellow-600 mt-1 inline-flex text-xs">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Featured
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && !isEditing && activeTab === 'details' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="min-h-[36px] px-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="ml-1 hidden sm:inline">Edit</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="min-h-[36px] w-[36px] p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            {/* Category and Links Row */}
            <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="capitalize">
                {equipment.category.replace(/_/g, ' ')}
                {equipment.msrp && <span className="hidden sm:inline"> • MSRP ${equipment.msrp}</span>}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`/equipment/${equipmentId}`, '_blank')}
                className="text-xs min-h-[32px] px-2"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Equipment Page</span>
                <span className="sm:hidden">Equipment Page</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Tab Navigation - Scrollable on mobile */}
            <div className="sticky top-0 z-20 bg-background border-b flex-shrink-0 overflow-x-auto">
              <TabsList className="w-full sm:w-auto h-auto p-0 bg-transparent rounded-none flex sm:grid sm:grid-cols-5 min-w-0">
                <TabsTrigger 
                  value="details" 
                  className="flex-shrink-0 min-w-[80px] px-2 sm:px-4 py-2.5 sm:py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs sm:text-sm whitespace-nowrap"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger 
                  value="photos" 
                  className="flex-shrink-0 min-w-[80px] px-2 sm:px-4 py-2.5 sm:py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs sm:text-sm whitespace-nowrap"
                >
                  <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  Photos
                </TabsTrigger>
                <TabsTrigger 
                  value="videos" 
                  className="flex-shrink-0 min-w-[80px] px-2 sm:px-4 py-2.5 sm:py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs sm:text-sm whitespace-nowrap"
                >
                  <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  Videos
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews" 
                  className="flex-shrink-0 min-w-[80px] px-2 sm:px-4 py-2.5 sm:py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs sm:text-sm whitespace-nowrap"
                >
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  Reviews
                </TabsTrigger>
                <TabsTrigger 
                  value="forums" 
                  className="flex-shrink-0 min-w-[80px] px-2 sm:px-4 py-2.5 sm:py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs sm:text-sm whitespace-nowrap"
                >
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  Forums
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {/* Details Tab */}
              <TabsContent value="details" className="h-full mt-0">
                <ScrollArea className="h-full px-4 sm:px-6 py-4">
                  {isEditing ? (
                    <div className="space-y-6">
                      {/* Photo Section */}
                      <div className="space-y-4">
                        <Label className="text-sm sm:text-base font-medium">Equipment Photo</Label>
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-24 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={formData.custom_photo_url || (equipment as any)?.primaryPhoto || equipment.image_url}
                              alt={`${equipment.brand} ${equipment.model}`}
                              className="w-full h-full object-contain"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.src.includes('placehold')) {
                                  target.style.objectFit = 'contain';
                                  target.style.padding = '0.5rem';
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowPhotoUpload(true)}
                              type="button"
                              className="min-h-[44px] px-4"
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Upload Photo
                            </Button>
                            {formData.custom_photo_url && (
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCropperImage(formData.custom_photo_url);
                                    setShowCropper(true);
                                    setPendingCropFile(null);
                                  }}
                                  type="button"
                                  className="min-h-[44px] px-3"
                                >
                                  <Crop className="w-4 h-4 mr-2" />
                                  Crop
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFormData({ ...formData, custom_photo_url: '' })}
                                  type="button"
                                  className="min-h-[44px] px-3"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Remove
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Community Photos Button */}
                        <Button
                          variant="outline"
                          onClick={() => setShowPhotoGallery(true)}
                          className="w-full min-h-[44px]"
                          type="button"
                        >
                          <Images className="w-4 h-4 mr-2" />
                          Browse Community Photos {equipmentPhotos.length > 0 && `(${equipmentPhotos.length})`}
                        </Button>
                      </div>

                      {/* Featured Toggle */}
                      <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                        <div>
                          <Label className="text-sm sm:text-base">Featured Equipment</Label>
                          <p className="text-sm text-muted-foreground">
                            Featured equipment appears in your bag preview
                          </p>
                        </div>
                        <Button
                          variant={formData.is_featured ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFormData({ ...formData, is_featured: !formData.is_featured })}
                          type="button"
                          className="min-h-[44px] px-4"
                        >
                          {formData.is_featured ? (
                            <><Star className="w-4 h-4 mr-2 fill-current" />Featured</>
                          ) : (
                            <><StarOff className="w-4 h-4 mr-2" />Not Featured</>
                          )}
                        </Button>
                      </div>

                      {/* Configuration Fields */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Shaft Selection - Only for clubs */}
                        {isClub && (
                          <div>
                            <Label className="text-sm sm:text-base">Shaft</Label>
                            <Popover open={shaftOpen} onOpenChange={setShaftOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between min-h-[44px] text-sm sm:text-base"
                                  type="button"
                                >
                                  {formData.shaft_id
                                    ? shafts.find((s) => s.id === formData.shaft_id)?.brand + ' ' +
                                      shafts.find((s) => s.id === formData.shaft_id)?.model
                                    : "Select shaft..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput placeholder="Search shafts..." />
                                  <CommandEmpty>No shaft found.</CommandEmpty>
                                  <CommandList>
                                    <CommandGroup>
                                      {shafts.map((shaft) => (
                                        <CommandItem
                                          key={shaft.id}
                                          value={`${shaft.brand} ${shaft.model}`}
                                          onSelect={() => {
                                            setFormData({ ...formData, shaft_id: shaft.id });
                                            setShaftOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              formData.shaft_id === shaft.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {shaft.brand} {shaft.model}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}

                        {/* Grip Selection - Only for clubs */}
                        {isClub && (
                          <div>
                            <Label className="text-sm sm:text-base">Grip</Label>
                            <Popover open={gripOpen} onOpenChange={setGripOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between min-h-[44px] text-sm sm:text-base"
                                  type="button"
                                >
                                  {formData.grip_id
                                    ? grips.find((g) => g.id === formData.grip_id)?.brand + ' ' +
                                      grips.find((g) => g.id === formData.grip_id)?.model
                                    : "Select grip..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput placeholder="Search grips..." />
                                  <CommandEmpty>No grip found.</CommandEmpty>
                                  <CommandList>
                                    <CommandGroup>
                                      {grips.map((grip) => (
                                        <CommandItem
                                          key={grip.id}
                                          value={`${grip.brand} ${grip.model}`}
                                          onSelect={() => {
                                            setFormData({ ...formData, grip_id: grip.id });
                                            setGripOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              formData.grip_id === grip.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {grip.brand} {grip.model}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}

                        {/* Loft Selection */}
                        {isClub && (() => {
                          // Get loft options for this category (check both singular and plural)
                          const categoryLoftOptions = LOFT_OPTIONS[equipment.category] || 
                                                     LOFT_OPTIONS[equipment.category.replace(/s$/, '')] || // Remove trailing 's'
                                                     null;
                          
                          if (!categoryLoftOptions) return null;
                          
                          // Check if the current loft is a custom value (not in the predefined list)
                          const isCustomLoft = formData.loft && 
                                              formData.loft !== 'none' && 
                                              !categoryLoftOptions.includes(formData.loft);
                          
                          return (
                            <div>
                              <Label className="text-sm sm:text-base">Loft</Label>
                              <Select
                                value={isCustomLoft || showCustomLoft ? 'custom' : (formData.loft || 'none')}
                                onValueChange={(value) => {
                                  if (value === 'custom') {
                                    setShowCustomLoft(true);
                                    // Clear the loft value when switching to custom
                                    if (!isCustomLoft) {
                                      setFormData({ ...formData, loft: '' });
                                    }
                                    return;
                                  }
                                  setShowCustomLoft(false);
                                  setFormData({ ...formData, loft: value === 'none' ? '' : value });
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select loft">
                                    {formData.loft || 'Select loft'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] overflow-y-auto z-[9999]" position="popper" sideOffset={5}>
                                  <SelectItem value="none">None</SelectItem>
                                  {categoryLoftOptions.map((loft) => (
                                    <SelectItem key={loft} value={loft}>
                                      {loft}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="custom" className="border-t">
                                    <div className="flex items-center">
                                      <Plus className="mr-2 h-4 w-4" />
                                      Custom Loft...
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              
                              {/* Custom Loft Input - Show when custom is selected or current value is custom */}
                              {(isCustomLoft || showCustomLoft) && (
                                <div className="mt-2">
                                  <Input
                                    type="text"
                                    placeholder="Enter custom loft (e.g., 9.75°)"
                                    value={formData.loft || ''}
                                    onChange={(e) => setFormData({ ...formData, loft: e.target.value })}
                                    className="w-full"
                                    autoFocus
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Enter your custom loft value (include ° symbol if desired)
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Condition */}
                        <div>
                          <Label className="text-sm sm:text-base">Condition</Label>
                          <Select
                            value={formData.condition}
                            onValueChange={(value) => setFormData({ ...formData, condition: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="excellent">Excellent</SelectItem>
                              <SelectItem value="good">Good</SelectItem>
                              <SelectItem value="fair">Fair</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Iron Configuration */}
                      {isIron && (
                        <div className="space-y-3">
                          <Label className="text-sm sm:text-base">Iron Configuration</Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={formData.iron_config_type === 'set' ? 'default' : 'outline'}
                              onClick={() => setFormData({ ...formData, iron_config_type: 'set' })}
                              className="flex-1 min-h-[44px]"
                              size="sm"
                            >
                              Iron Set
                            </Button>
                            <Button
                              type="button"
                              variant={formData.iron_config_type === 'single' ? 'default' : 'outline'}
                              onClick={() => setFormData({ ...formData, iron_config_type: 'single' })}
                              className="flex-1 min-h-[44px]"
                              size="sm"
                            >
                              Single Iron
                            </Button>
                          </div>
                          {formData.iron_config_type === 'set' ? (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">From</Label>
                                <Select
                                  value={formData.iron_from}
                                  onValueChange={(value) => setFormData({ ...formData, iron_from: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {IRON_OPTIONS.map((iron) => (
                                      <SelectItem key={iron} value={iron}>
                                        {iron}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">To</Label>
                                <Select
                                  value={formData.iron_to}
                                  onValueChange={(value) => setFormData({ ...formData, iron_to: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {IRON_OPTIONS.map((iron) => (
                                      <SelectItem 
                                        key={iron} 
                                        value={iron}
                                        disabled={getIronIndex(iron) < getIronIndex(formData.iron_from)}
                                      >
                                        {iron}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : (
                            <Select
                              value={formData.iron_single}
                              onValueChange={(value) => setFormData({ ...formData, iron_single: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select iron" />
                              </SelectTrigger>
                              <SelectContent>
                                {IRON_OPTIONS.map((iron) => (
                                  <SelectItem key={iron} value={iron}>
                                    {iron} iron
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}

                      {/* Purchase Details */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm sm:text-base">Purchase Price</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={formData.purchase_price}
                            onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-sm sm:text-base">Purchase Date</Label>
                          <Input
                            type="date"
                            value={formData.purchase_date}
                            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <Label className="text-sm sm:text-base">Notes</Label>
                        <Textarea
                          placeholder="Any special notes about this equipment..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                          className="text-sm sm:text-base"
                        />
                      </div>

                      {/* Action Buttons - Fixed position on mobile */}
                      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t fixed sm:static bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:right-auto bg-background px-4 sm:px-0 pb-4 sm:pb-0 z-30">
                        <Button 
                          variant="destructive" 
                          onClick={handleRemove}
                          disabled={loading}
                          size="sm"
                          className="min-h-[44px] w-full sm:w-auto"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          <span className="sm:hidden">Remove</span>
                          <span className="hidden sm:inline">Remove from Bag</span>
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            disabled={loading}
                            className="flex-1 sm:flex-initial min-h-[44px]"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 sm:flex-initial min-h-[44px]"
                          >
                            {loading ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Main Image - Responsive and no padding */}
                      <div className="relative w-full px-4 sm:px-0">
                        <div className="aspect-square max-w-[280px] sm:max-w-sm md:max-w-md mx-auto bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-2xl">
                          <img
                            src={bagEquipment?.custom_photo_url || (equipment as any)?.primaryPhoto || equipment.image_url || ''}
                            alt={`${equipment.brand} ${equipment.model}`}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              // If image fails to load and it's not a placeholder, switch to contain mode
                              if (!target.src.includes('placehold')) {
                                target.style.objectFit = 'contain';
                                target.style.padding = '1.5rem';
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Compact Affiliate Links */}
                      {links.length > 0 && (
                        <div className="flex flex-wrap gap-2 pb-3 border-b">
                          {links.map((link: any) => (
                            <a
                              key={link.id}
                              href={`/api/links/redirect?id=${link.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
                                "bg-green-600/10 hover:bg-green-600/20 text-green-600 border border-green-600/20",
                                "transition-colors",
                                link.is_primary && "bg-green-600 hover:bg-green-700 text-white border-green-600"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>{link.retailer_name || 'Buy'}</span>
                              {link.price && (
                                <span className="font-semibold">${link.price}</span>
                              )}
                            </a>
                          ))}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // TODO: Open link management modal
                                toast.info('Add your favorite retailer or affiliate link for this item');
                              }}
                              className="h-auto py-1.5 px-2 text-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                      {canEdit && links.length === 0 && (
                        <div className="flex items-center gap-2 pb-3 border-b">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Open link management modal
                              toast.info('Add your favorite retailer or affiliate link for this item');
                            }}
                            className="text-xs"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Add Buy Links
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto"
                            onClick={() => toast.info('Add your favorite retailer or affiliate link for this item')}
                          >
                            <Info className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      )}

                      {/* Equipment Info */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold mb-2 text-base sm:text-lg">Equipment Details</h3>
                          <div className="space-y-2 text-sm sm:text-base">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Brand</span>
                              <span className="font-medium">{equipment.brand}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Model</span>
                              <span className="font-medium">{equipment.model}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Category</span>
                              <span className="font-medium capitalize">
                                {equipment.category.replace(/_/g, ' ')}
                              </span>
                            </div>
                            {equipment.release_year && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Release Year</span>
                                <span className="font-medium">{equipment.release_year}</span>
                              </div>
                            )}
                            {formData.loft && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Loft</span>
                                <span className="font-medium">{formData.loft}</span>
                              </div>
                            )}
                            {formData.condition && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Condition</span>
                                <span className="font-medium capitalize">{formData.condition}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Build Configuration */}
                        {(bagEquipment.shaft || bagEquipment.grip) && (
                          <div>
                            <h3 className="font-semibold mb-2 text-base sm:text-lg">Build Configuration</h3>
                            <div className="space-y-2">
                              {bagEquipment.shaft && (
                                <div className="p-3 bg-muted rounded-lg">
                                  <p className="text-xs text-muted-foreground mb-1">Shaft</p>
                                  <p className="font-medium">
                                    {bagEquipment.shaft.brand} {bagEquipment.shaft.model}
                                  </p>
                                </div>
                              )}
                              {bagEquipment.grip && (
                                <div className="p-3 bg-muted rounded-lg">
                                  <p className="text-xs text-muted-foreground mb-1">Grip</p>
                                  <p className="font-medium">
                                    {bagEquipment.grip.brand} {bagEquipment.grip.model}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Notes */}
                        {formData.notes && (
                          <div className="pb-16 sm:pb-0">
                            <h3 className="font-semibold mb-2 text-base sm:text-lg">Notes</h3>
                            <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap">
                              {formData.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Photos Tab */}
              <TabsContent value="photos" className="h-full mt-0">
                <ScrollArea className="h-full px-4 sm:px-6 py-4">
                  {equipmentPhotos.length > 0 ? (
                    <div className="space-y-4">
                      {/* Action Bar */}
                      {canEdit && (
                        <div className="flex gap-2 pb-4 border-b">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPhotoUpload(true)}
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Upload Photo
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPhotoGallery(true)}
                          >
                            <Images className="w-4 h-4 mr-2" />
                            Browse Gallery
                          </Button>
                        </div>
                      )}
                      
                      {/* Photo Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {equipmentPhotos.map((photo, index) => (
                          <div 
                            key={photo.id} 
                            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 group cursor-pointer"
                            onClick={() => {
                              setSelectedPhotoIndex(index);
                              setShowLightbox(true);
                            }}
                          >
                            <img
                              src={photo.photo_url}
                              alt="Equipment photo"
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <Expand className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            
                            {/* Labels */}
                            {photo.id === 'custom-photo' && (
                              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                Your Photo
                              </div>
                            )}
                            {photo.id === 'main-photo' && (
                              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                Stock Photo
                              </div>
                            )}
                            
                            {/* Like Button */}
                            {photo.id !== 'custom-photo' && photo.id !== 'main-photo' && (
                              <div 
                                className="absolute bottom-2 right-2 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <TeedBallLike
                                  isLiked={photo.is_liked_by_user || false}
                                  likeCount={photo.likes_count || 0}
                                  onToggle={() => handlePhotoLike(photo.id, photo.is_liked_by_user || false)}
                                  size="sm"
                                  showCount={true}
                                  className="bg-black/60 rounded-lg p-1"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No photos available yet</p>
                      {canEdit && (
                        <Button
                          variant="outline"
                          onClick={() => setShowPhotoUpload(true)}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Upload First Photo
                        </Button>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Videos Tab */}
              <TabsContent value="videos" className="h-full mt-0">
                <ScrollArea className="h-full px-4 sm:px-6 py-4">
                  {equipmentId ? (
                    <EquipmentVideosPanel
                      equipmentId={equipmentId}
                      equipmentName={`${equipment.brand} ${equipment.model}`}
                      canAdd={canEdit}
                      className="pr-0"
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No equipment selected
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="h-full mt-0">
                <ScrollArea className="h-full px-4 sm:px-6 py-4">
                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">
                                {review.profiles?.display_name || review.profiles?.username}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            {review.rating && (
                              <Badge variant="secondary">⭐ {review.rating}/5</Badge>
                            )}
                          </div>
                          <p className="text-sm">{review.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No reviews yet. Be the first to review!
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Forums Tab */}
              <TabsContent value="forums" className="h-full mt-0">
                <ScrollArea className="h-full px-4 sm:px-6 py-4">
                  {forumThreads.length > 0 ? (
                    <div className="space-y-4">
                      {forumThreads.map((thread) => (
                        <a
                          key={thread.id}
                          href={`/forum/thread/${thread.id}`}
                          className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <h4 className="font-medium mb-1">{thread.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {thread.content}
                          </p>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No forum discussions yet
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Photo Management Dialogs */}
    <CommunityPhotosGallery
      isOpen={showPhotoGallery}
      onClose={() => setShowPhotoGallery(false)}
      equipmentId={equipmentId}
      onSelectPhoto={(photoUrl) => {
        setFormData({ ...formData, custom_photo_url: photoUrl });
        toast.success('Photo selected');
      }}
    />

    <ImageCropper
      isOpen={showCropper}
      onClose={() => {
        setShowCropper(false);
        setCropperImage('');
        setPendingCropFile(null);
      }}
      imageUrl={cropperImage}
      onCropComplete={async (croppedImageUrl) => {
        setFormData({ ...formData, custom_photo_url: croppedImageUrl });
        setShowCropper(false);
        setCropperImage('');
        setPendingCropFile(null);
      }}
      aspectRatio={1}
      title="Crop Equipment Photo"
    />

    <UnifiedPhotoUploadDialog
      isOpen={showPhotoUpload}
      onClose={() => setShowPhotoUpload(false)}
      onUploadComplete={(photoUrl) => {
        setFormData({ ...formData, custom_photo_url: photoUrl });
        loadAdditionalData();
      }}
      context={{
        type: 'equipment',
        equipmentId: equipmentId,
        equipmentName: `${equipment.brand} ${equipment.model}`,
        bagId: bagId,
        bagName: bagEquipment?.bag?.name
      }}
      initialCaption={`Check out my ${equipment.brand} ${equipment.model}!`}
    />
    
    <PhotoLightbox
      isOpen={showLightbox}
      onClose={() => setShowLightbox(false)}
      photos={equipmentPhotos}
      initialPhotoIndex={selectedPhotoIndex}
      onLike={handlePhotoLike}
      showLikes={true}
    />
    </>
  );
}

export default React.memo(BagEquipmentModal);