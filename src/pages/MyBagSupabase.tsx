/* @refresh skip */
import { useState, useEffect, lazy, Suspense } from "react";
import { Plus, Edit3, Save, X, Settings, Trash2, Grid3x3, List, Zap, AlertTriangle, Trophy, CreditCard } from "lucide-react";
import { Navigate, Link } from "react-router-dom";
import BackgroundLayer from "@/components/BackgroundLayer";
import BackgroundPicker from "@/components/BackgroundPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navigation from "@/components/Navigation";
import { BagSelectorDialog } from "@/components/bag/BagSelectorDialog";
import { CreateBagDialog } from "@/components/bag/CreateBagDialog";
import { bagLayoutsService, type BagLayout } from "@/services/bagLayouts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase";
import { smartCreateBagPost, smartCreateBagUpdatePost, smartCreateEquipmentPost } from "@/services/feedSmartUpdate";
import { badgeService, type UserBadge } from "@/services/badges";
import { BadgeShowcase } from "@/components/badges/BadgeShowcase";
import { useBadgeCheck } from "@/hooks/useBadgeCheck";
import { BadgeNotificationToast } from "@/components/badges/BadgeNotificationToast";
import { BagCard } from "@/components/bags/BagCard";
import { BadgeDisplay } from "@/components/badges/BadgeDisplay";
import BagStatsRow from "@/components/bag/BagStatsRow";
import { BadgeService } from "@/services/badgeService";
import { formatCompactCurrency, formatCompactNumber } from "@/lib/formatters";

// Lazy load heavy components with @dnd-kit
const BagGalleryDndKit = lazy(() => import("@/components/bag/BagGalleryDndKit"));
const EquipmentSelectorImproved = lazy(() => import("@/components/equipment/EquipmentSelectorImproved"));
const EquipmentEditor = lazy(() => import("@/components/bag/EquipmentEditor"));

// Loading component for heavy components
const ComponentLoadingFallback = () => {
  try {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  } catch (error) {
    // Fallback if Skeleton component has issues
    return <div className="text-white">Loading...</div>;
  }
};

type BagEquipmentItem = Database['public']['Tables']['bag_equipment']['Row'] & {
  equipment: Database['public']['Tables']['equipment']['Row'];
  shaft?: Database['public']['Tables']['shafts']['Row'];
  grip?: Database['public']['Tables']['grips']['Row'];
  loft_option?: Database['public']['Tables']['loft_options']['Row'];
};

type Bag = Database['public']['Tables']['user_bags']['Row'] & {
  profile?: Database['public']['Tables']['profiles']['Row'];
};

const MyBagSupabase = () => {
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    // Error handled by returning error UI
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Error loading authentication</h2>
          <p className="text-white/70">Please try refreshing the page</p>
        </div>
      </div>
    );
  }
  
  // All hooks at the top, no logic between them
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [bags, setBags] = useState<Bag[]>([]);
  const [currentBag, setCurrentBag] = useState<Bag | null>(null);
  const [bagName, setBagName] = useState("");
  const [bagDescription, setBagDescription] = useState("");
  const [bagItems, setBagItems] = useState<BagEquipmentItem[]>([]);
  const [selectedBackground, setSelectedBackground] = useState('midwest-lush');
  const [viewMode, setViewMode] = useState<'gallery' | 'list' | 'card'>('gallery');
  const [layout, setLayout] = useState<BagLayout>({});
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [showBagSelector, setShowBagSelector] = useState(false);
  const [showCreateBag, setShowCreateBag] = useState(false);
  const [equipmentSelectorOpen, setEquipmentSelectorOpen] = useState(false);
  const [equipmentEditorOpen, setEquipmentEditorOpen] = useState(false);
  const [selectedBagEquipment, setSelectedBagEquipment] = useState<BagEquipmentItem | null>(null);
  const [totalTees, setTotalTees] = useState(0);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  
  // Badge check hook
  const { checkBadgeProgress, newBadges, clearNewBadges } = useBadgeCheck();
  
  // Extract values after all hooks
  if (!authContext) {
    return <Navigate to="/" replace />;
  }
  
  // Safely extract user and loading state
  const user = authContext.user || null;
  const authLoading = authContext.loading || false;
  
  // Check for Symbol properties that might cause conversion errors
  if (user && Object.getOwnPropertySymbols(user).length > 0) {
    // User object contains Symbol properties - this is expected with Supabase
  }

  // Show sign-in prompt if not logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10">
        <Navigation />
        <div className="container mx-auto px-4 pt-32">
          <div className="max-w-md mx-auto text-center">
            <div className="glass-card p-8">
              <h1 className="text-3xl font-bold text-white mb-4">Sign In to View Your Bag</h1>
              <p className="text-white/70 mb-6">
                Create an account to build and showcase your golf bag collection.
              </p>
              <Button 
                onClick={() => window.location.href = '/?signin=true'} 
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const initializePage = async () => {
      console.log('[MyBag] Initializing page for user:', user?.id);
      try {
        if (user) {
          await Promise.all([
            loadBags().catch(err => {
              console.error('[MyBag] Error loading bags:', err);
              toast.error('Failed to load bags');
            }),
            calculateTotalTees().catch(err => {
              console.error('[MyBag] Error calculating tees:', err);
              // Don't show error toast for tees calculation
            }),
            loadUserBadges().catch(err => {
              console.error('[MyBag] Error loading badges:', err);
              // Don't show error toast for badges
            })
          ]);
        }
      } catch (error) {
        console.error('[MyBag] Critical error initializing page:', error);
        toast.error('Failed to load bag data. Please refresh the page.');
      }
    };
    
    initializePage();
  }, [user]);
  
  const calculateTotalTees = async () => {
    console.log('[MyBag] Calculating total tees');
    try {
      if (!user || !user.id) {
        console.log('[MyBag] No user available for tee calculation');
        return;
      }
      
      // Ensure user.id is a string safely
      const userId = user.id ? String(user.id) : '';
      
      // First get the user's bag IDs
      const { data: userBags, error: bagsError } = await supabase
        .from('user_bags')
        .select('id')
        .eq('user_id', userId);
      
      
      // Count tees from user's bags if they have any
      let bagTees = 0;
      if (userBags && Array.isArray(userBags) && userBags.length > 0) {
        const bagIds = userBags.map(bag => String(bag.id));
        const { count } = await supabase
          .from('bag_likes')
          .select('*', { count: 'exact', head: true })
          .in('bag_id', bagIds);
        bagTees = count || 0;
      }
      
      // First get the user's post IDs
      const { data: userPosts, error: postsError } = await supabase
        .from('feed_posts')
        .select('id')
        .eq('user_id', userId);
      
      if (postsError) {
        // Error fetching posts, continue with calculation
      }
      
      // Count tees from user's posts if they have any
      let postTees = 0;
      if (userPosts && Array.isArray(userPosts) && userPosts.length > 0) {
        const postIds = userPosts.map(post => String(post.id));
        const { count } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds);
        postTees = count || 0;
      }
      
      const total = (bagTees || 0) + (postTees || 0);
      setTotalTees(total);
      console.log('[MyBag] Total tees calculated:', total);
    } catch (error) {
      console.error('[MyBag] Error in calculateTotalTees:', error);
      setTotalTees(0);
      // Don't throw - this is not critical functionality
    }
  };

  const loadUserBadges = async () => {
    if (!user) return;
    
    try {
      const badges = await badgeService.getUserBadges(user.id);
      setUserBadges(badges);
    } catch (error) {
      console.error('Error loading badges:', error);
    }
  };

  const loadBags = async () => {
    console.log('[MyBag] Loading bags for user:', user?.id);
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load user's bags
      const { data: userBags, error } = await supabase
        .from('user_bags')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[MyBag] Database error loading bags:', error);
        throw new Error(error?.message || 'Failed to load bags');
      }


      // Create a bag if user doesn't have one
      if (!userBags || userBags.length === 0) {
        const { data: newBag, error: createError } = await supabase
          .from('user_bags')
          .insert({
            user_id: user.id,
            name: 'My Bag',
            bag_type: 'real'
          })
          .select('*, profile:profiles(*)')
          .single();

        if (createError) throw createError;
        
        setBags([newBag]);
        setCurrentBag(newBag);
        await loadBagEquipment(newBag.id);
      } else {
        setBags(userBags);
        
        if (userBags.length === 1) {
          // Auto-select the only bag
          const bag = userBags[0];
          setCurrentBag(bag);
          setBagName(bag.name);
          setBagDescription(bag.description || '');
          setSelectedBackground(bag.background_image || 'midwest-lush');
          await loadBagEquipment(bag.id);
        } else {
          // Show bag selector for multiple bags
          setShowBagSelector(true);
        }
      }
    } catch (error) {
      // Error loading bags
      toast.error('Failed to load your bags');
    } finally {
      setLoading(false);
    }
  };

  const loadBagEquipment = async (bagId: string) => {
    console.log('[MyBag] Loading equipment for bag:', bagId);
    try {
      // First try with all joins (if tables exist)
      let { data, error } = await supabase
        .from('bag_equipment')
        .select(`
          *,
          equipment(
            *,
            equipment_photos (
              id,
              photo_url,
              likes_count,
              is_primary
            )
          ),
          shaft:shafts(*),
          grip:grips(*),
          loft_option:loft_options(*)
        `)
        .eq('bag_id', bagId)
        .order('added_at');

      // If that fails, try without the optional joins
      if (error) {
        
        const result = await supabase
          .from('bag_equipment')
          .select(`
            *,
            equipment(
              *,
              equipment_photos (
                id,
                photo_url,
                likes_count,
                is_primary
              )
            )
          `)
          .eq('bag_id', bagId)
          .order('added_at');
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        // Error loading equipment
        console.error('Error loading equipment:', error);
        throw new Error(error?.message || 'Failed to load equipment');
      }

      // Process the data to calculate most liked photos
      const processedData = data?.map(item => {
        if (item.equipment && item.equipment.equipment_photos) {
          // Sort photos by likes_count to get the most liked one
          const sortedPhotos = [...item.equipment.equipment_photos].sort((a, b) => 
            (b.likes_count || 0) - (a.likes_count || 0)
          );
          
          // Add most_liked_photo to equipment object
          item.equipment.most_liked_photo = sortedPhotos[0]?.photo_url || null;
          item.equipment.primaryPhoto = item.equipment.most_liked_photo || item.equipment.image_url;
        }
        return item;
      }) || [];

      // Equipment loaded successfully
      setBagItems(processedData);
      
      // Load layout data
      const loadedLayout = await bagLayoutsService.loadLayout(bagId);
      if (loadedLayout) {
        setLayout(loadedLayout);
      } else if (data && data.length > 0) {
        // Generate default layout if none exists
        const defaultLayout = bagLayoutsService.generateDefaultLayout(
          data.map((item: any) => ({
            id: item.equipment_id,
            category: item.equipment.category
          }))
        );
        setLayout(defaultLayout);
      }
    } catch (error) {
      // Error loading bag equipment
      // Don't show error toast for empty bags, just set empty array
      setBagItems([]);
      // Only show error if it's not a "no rows" error
      if (error?.message && !error.message.includes('No rows')) {
        toast.error('Failed to load equipment');
      }
    }
  };

  const handleSelectBag = async (bagId: string) => {
    const bag = bags.find(b => b.id === bagId);
    if (bag) {
      setCurrentBag(bag);
      setBagName(bag.name);
      setBagDescription(bag.description || '');
      setSelectedBackground(bag.background_image || 'midwest-lush');
      await loadBagEquipment(bag.id);
    }
  };

  const handleCreateBag = async (name: string, type: string) => {
    if (!user) return;

    try {
      const { data: newBag, error } = await supabase
        .from('user_bags')
        .insert({
          user_id: user.id,
          name,
          bag_type: type
        })
        .select('*, profile:profiles(*)')
        .single();

      if (error) throw new Error(error?.message || 'Database operation failed');

      setBags([...bags, newBag]);
      setCurrentBag(newBag);
      setBagName(newBag.name);
      setBagDescription('');
      setSelectedBackground('midwest-lush');
      setBagItems([]);
      
      // Create feed post for bag creation
      await smartCreateBagPost(user.id, newBag.id, newBag.name);
    } catch (error) {
      // Error creating bag
      toast.error('Failed to create bag');
      throw new Error(error?.message || 'Operation failed');
    }
  };

  const handleDeleteBag = async (bagId: string) => {
    try {
      const { error } = await supabase
        .from('user_bags')
        .delete()
        .eq('id', bagId);

      if (error) throw new Error(error?.message || 'Database operation failed');

      const remainingBags = bags.filter(b => b.id !== bagId);
      setBags(remainingBags);
      
      if (currentBag?.id === bagId && remainingBags.length > 0) {
        await handleSelectBag(remainingBags[0].id);
      }
    } catch (error) {
      // Error deleting bag
      toast.error('Failed to delete bag');
      throw new Error(error?.message || 'Operation failed');
    }
  };


  const handleSave = async () => {
    if (!currentBag) return;
    
    try {
      const { error } = await supabase
        .from('user_bags')
        .update({
          name: bagName,
          description: bagDescription,
          background_image: selectedBackground,
          bag_type: currentBag.bag_type || 'main',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentBag.id);

      if (error) throw new Error(error?.message || 'Database operation failed');
      
      setIsEditing(false);
      toast.success("Bag saved successfully!");
      
      // Track changes for feed post
      const changes = [];
      if (currentBag.name !== bagName) changes.push(`Renamed bag to "${bagName}"`);
      if (currentBag.description !== bagDescription) changes.push('Updated description');
      if (currentBag.background_image !== selectedBackground) changes.push('Changed background');
      
      // Create feed post if there were changes
      if (changes.length > 0) {
        await smartCreateBagUpdatePost(user.id, currentBag.id, bagName, changes);
      }
      
      // Update local state
      setBags(bags.map(b => 
        b.id === currentBag.id 
          ? { ...b, name: bagName, description: bagDescription, background_image: selectedBackground }
          : b
      ));
      setCurrentBag({ ...currentBag, name: bagName, description: bagDescription, background_image: selectedBackground });
    } catch (error) {
      // Error saving bag
      toast.error('Failed to save bag');
    }
  };

  const addEquipment = async (selection: {
    equipment_id: string;
    shaft_id?: string;
    grip_id?: string;
    loft_option_id?: string;
  }) => {
    if (!currentBag) return;
    
    try {
      // Adding equipment to bag
      
      // First, let's try a minimal insert to see what works
      const insertData = {
        bag_id: currentBag.id,
        equipment_id: selection.equipment_id,
        condition: 'new'
      };
      
      // Preparing equipment insert
      
      const { data: newItem, error } = await supabase
        .from('bag_equipment')
        .insert(insertData)
        .select(`
          *,
          equipment(*)
        `)
        .single();

      if (error) {
        // Error adding equipment
        console.error('Error adding equipment:', error);
        throw new Error(error?.message || 'Failed to add equipment');
      }
      
      // Equipment added successfully
      
      // Now update with the customization options if the item was created
      if (newItem && (selection.shaft_id || selection.grip_id || selection.loft_option_id)) {
        const { data: updatedItem, error: updateError } = await supabase
          .from('bag_equipment')
          .update({
            shaft_id: selection.shaft_id || null,
            grip_id: selection.grip_id || null,
            loft_option_id: selection.loft_option_id || null
          })
          .eq('id', newItem.id)
          .select(`
            *,
            equipment(*),
            shaft:shafts(*),
            grip:grips(*),
            loft_option:loft_options(*)
          `)
          .single();
          
        if (updateError) {
          // Error updating equipment options
          // Don't fail the whole operation, just use the basic item
        } else if (updatedItem) {
          setBagItems(prev => [...prev, updatedItem]);
          setEquipmentSelectorOpen(false);
          toast.success(`Equipment added to your bag!`);
          
          // Check badge progress after adding equipment
          checkBadgeProgress();
          return;
        }
      }
      
      setBagItems(prev => [...prev, newItem]);
      setEquipmentSelectorOpen(false);
      toast.success(`Equipment added to your bag!`);
      
      // Create feed post for equipment addition
      const equipmentName = `${newItem.equipment.brand} ${newItem.equipment.model}`;
      await smartCreateEquipmentPost(
        user.id, 
        currentBag.id, 
        currentBag.name,
        equipmentName,
        newItem.equipment.id
      );
      
      // Check badge progress after adding equipment
      checkBadgeProgress();
    } catch (error) {
      // Error adding equipment
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to add equipment: ${errorMessage}`);
    }
  };

  const removeItem = async (bagEquipmentId: string) => {
    try {
      const { error } = await supabase
        .from('bag_equipment')
        .delete()
        .eq('id', bagEquipmentId);

      if (error) throw new Error(error?.message || 'Database operation failed');

      setBagItems(prev => prev.filter(item => item.id !== bagEquipmentId));
      toast.success("Equipment removed from bag");
    } catch (error) {
      // Error removing equipment
      toast.error('Failed to remove equipment');
    }
  };

  const autoFillBag = async () => {
    if (!currentBag) return;
    
    const categories = [
      'driver', 'fairway_wood', 'hybrid', 'iron', 
      'wedge', 'putter', 'ball', 'bag', 
      'glove', 'rangefinder', 'gps'
    ];
    
    try {
      setLoading(true);
      const existingCategories = new Set(bagItems.map(item => item.equipment.category));
      const missingCategories = categories.filter(cat => !existingCategories.has(cat));
      
      if (missingCategories.length === 0) {
        toast.info('Your bag already has equipment from all categories!');
        return;
      }
      
      for (const category of missingCategories) {
        // Get most popular equipment in this category
        const { data: equipment, error } = await supabase
          .from('equipment')
          .select('*')
          .eq('category', category)
          .order('popularity_score', { ascending: false })
          .limit(1)
          .single();
          
        if (error || !equipment) continue;
        
        // Add to bag
        await addEquipment({
          equipment_id: equipment.id
        });
      }
      
      toast.success(`Added ${missingCategories.length} items to your bag!`);
      await loadBagEquipment(currentBag.id);
    } catch (error) {
      // Error auto-filling bag
      toast.error('Failed to auto-fill bag');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (bagEquipmentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bag_equipment')
        .update({ is_featured: !currentStatus })
        .eq('id', bagEquipmentId);

      if (error) throw new Error(error?.message || 'Database operation failed');
      
      setBagItems(prev =>
        prev.map(item =>
          item.id === bagEquipmentId
            ? { ...item, is_featured: !currentStatus }
            : item
        )
      );
    } catch (error) {
      // Error updating equipment
      toast.error('Failed to update equipment');
    }
  };


  const handleEditEquipment = (item: BagEquipmentItem) => {
    setSelectedBagEquipment(item);
    setEquipmentEditorOpen(true);
  };

  const totalValue = bagItems.reduce((sum, item) => 
    sum + (item.purchase_price || item.equipment.msrp || 0), 0
  );

  // Calculate featured items by category
  const featuredCounts = (() => {
    const CLUB_CATEGORIES = ['driver', 'fairway_wood', 'hybrid', 'iron', 'wedge', 'putter'];
    const ACCESSORY_CATEGORIES = ['ball', 'glove', 'rangefinder', 'gps', 'tee', 'towel', 'ball_marker', 'divot_tool', 'accessories'];
    
    const featured = bagItems.filter(item => item.is_featured);
    const featuredClubs = featured.filter(item => CLUB_CATEGORIES.includes(item.equipment.category));
    const featuredAccessories = featured.filter(item => ACCESSORY_CATEGORIES.includes(item.equipment.category));
    const featuredBag = featured.find(item => item.equipment.category === 'bag');
    
    return {
      clubs: featuredClubs.length,
      accessories: featuredAccessories.length,
      bag: featuredBag ? 1 : 0,
      total: featured.length
    };
  })();

  // Check if featured items exceed display limits
  const featuredWarnings = [];
  if (featuredCounts.clubs > 6) {
    featuredWarnings.push(`${featuredCounts.clubs} featured clubs (only 6 will show)`);
  }
  if (featuredCounts.clubs + featuredCounts.bag > 6) {
    featuredWarnings.push(`${featuredCounts.clubs} featured clubs + ${featuredCounts.bag} featured bag (only 6 total will show)`);
  }
  if (featuredCounts.accessories > 4) {
    featuredWarnings.push(`${featuredCounts.accessories} featured accessories (only 4 will show)`);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10">
        <Navigation />
        <div className="container mx-auto px-4 pt-20">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const EmptyState = () => (
    <div className="text-center py-16 space-y-6">
      <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto">
        <Plus className="w-12 h-12 text-gray-400" />
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2 text-white">Start Building Your Bag</h3>
        <p className="text-gray-300">Add equipment to showcase your setup</p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={() => setEquipmentSelectorOpen(true)} variant="default">
          <Plus className="w-4 h-4 mr-2" />
          Add Equipment
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10">
      <BackgroundLayer backgroundId={selectedBackground} />
      <Navigation />
      
      <div className="container mx-auto px-4 pt-20 pb-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {isEditing ? (
              <Input
                value={bagName}
                onChange={(e) => setBagName(e.target.value)}
                className="text-3xl font-bold bg-transparent border-b border-white/20 text-white"
                placeholder="Bag Name"
              />
            ) : (
              <h1 className="text-3xl font-bold text-white">{bagName}</h1>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {!isEditing && (
              <>
                {/* View Mode Toggle */}
                <div className="bg-white/10 rounded-lg p-1 flex">
                  <Button
                    variant={viewMode === 'gallery' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('gallery')}
                    className={viewMode === 'gallery' ? '' : 'text-white hover:text-white hover:bg-white/10'}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list' ? '' : 'text-white hover:text-white hover:bg-white/10'}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'card' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('card')}
                    className={viewMode === 'card' ? '' : 'text-white hover:text-white hover:bg-white/10'}
                  >
                    <CreditCard className="w-4 h-4" />
                  </Button>
                </div>
                {bags.length > 1 && (
                  <Button onClick={() => setShowBagSelector(true)} variant="outline">
                    Switch Bag
                  </Button>
                )}
              </>
            )}
            {isEditing ? (
              <>
                <Button onClick={handleSave} variant="default">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button onClick={() => {
                  setIsEditing(false);
                  if (currentBag) {
                    setBagName(currentBag.name);
                    setBagDescription(currentBag.description || '');
                    setSelectedBackground(currentBag.background_image || 'midwest-lush');
                  }
                }} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {viewMode === 'gallery' && (
                  <Button
                    onClick={() => setIsEditingLayout(!isEditingLayout)}
                    variant={isEditingLayout ? 'destructive' : 'outline'}
                  >
                    {isEditingLayout ? 'Cancel Layout Edit' : 'Edit Layout'}
                  </Button>
                )}
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Bag
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Background Picker in Edit Mode */}
        {isEditing && (
          <div className="mb-6">
            <label className="text-sm text-white/80 mb-2 block">Bag Background</label>
            <BackgroundPicker
              currentBackground={selectedBackground}
              onBackgroundChange={setSelectedBackground}
            />
          </div>
        )}

        {/* Featured Items Warning */}
        {featuredWarnings.length > 0 && (
          <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/20">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-500">Too Many Featured Items</AlertTitle>
            <AlertDescription className="text-yellow-400/90">
              You have {featuredWarnings.join(', ')}. 
              Some featured items won't appear on your bag card.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/10 backdrop-blur-[10px] border-white/20">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-200">Total Tees</p>
              <p className="text-2xl font-bold text-white">{formatCompactNumber(totalTees)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-[10px] border-white/20">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-200">Equipment</p>
              <p className="text-2xl font-bold text-white">{bagItems.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-[10px] border-white/20">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-200">Featured</p>
              <p className="text-2xl font-bold text-white">
                {bagItems.filter(item => item.is_featured).length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-[10px] border-white/20">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-300">Est. Value</p>
              <p className="text-lg font-medium text-white">{formatCompactCurrency(totalValue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Badge Showcase */}
        <div className="mb-8 bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <BadgeShowcase 
              userBadges={userBadges} 
              userId={user.id}
              isOwnProfile={true}
            />
            <Link 
              to="/badges"
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Trophy className="w-4 h-4" />
              View All Badges
            </Link>
          </div>
        </div>

        {/* Equipment Display */}
        {bagItems.length === 0 ? (
          <EmptyState />
        ) : viewMode === 'gallery' ? (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <BagGalleryDndKit
              bagEquipment={bagItems}
              layout={layout}
              isEditing={isEditingLayout}
              isOwnBag={true}
              onLayoutChange={setLayout}
              onSaveLayout={async () => {
                if (!currentBag) return;
                const success = await bagLayoutsService.saveLayout(currentBag.id, layout);
                if (success) {
                  toast.success('Layout saved successfully!');
                  setIsEditingLayout(false);
                } else {
                  toast.error('Failed to save layout');
                }
              }}
              onEquipmentClick={handleEditEquipment}
            />
          </Suspense>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {bagItems.map((item) => (
              <Card key={item.id} className="bg-white/10 backdrop-blur-[10px] border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 cursor-pointer"
                      onClick={() => handleEditEquipment(item)}
                    >
                      <img
                        src={item.custom_photo_url || item.equipment.image_url}
                        alt={`${item.equipment.brand} ${item.equipment.model}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 cursor-pointer" onClick={() => handleEditEquipment(item)}>
                      <h3 className="font-semibold text-white hover:text-primary transition-colors">
                        {item.equipment.brand} {item.equipment.model}
                      </h3>
                      <p className="text-sm text-gray-300">
                        {item.shaft && `${item.shaft.brand} ${item.shaft.model} - ${item.shaft.flex}`}
                        {item.grip && ` • ${item.grip.brand} ${item.grip.model}`}
                        {item.loft_option && ` • ${item.loft_option.display_name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing && (
                        <>
                          <Button
                            size="sm"
                            variant={item.is_featured ? "default" : "outline"}
                            onClick={() => toggleFeatured(item.id, item.is_featured)}
                          >
                            {item.is_featured ? "Featured" : "Feature"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditEquipment(item)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {!isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Use the same editor as the gear button
                            handleEditEquipment(item);
                          }}
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Card View */
          <div className="flex justify-center">
            <div className="flex flex-col lg:flex-row gap-6 items-stretch">
              {/* Stats - 1 column on left */}
              <div className="flex-shrink-0 w-full lg:w-56">
                <div className="h-full bg-gray-900/50 rounded-lg p-4 border border-white/10">
                  <BagStatsRow
                    totalItems={bagItems.length}
                    bagTees={currentBag?.likes_count || 0}
                    views={currentBag?.views_count || 0}
                    estimatedValue={totalValue}
                  />
                </div>
              </div>
              
              {/* Bag Card - center */}
              <div className="flex-shrink-0 w-full max-w-sm">
                <BagCard
                  bag={{
                    ...currentBag!,
                    bag_equipment: bagItems,
                    profiles: authContext.profile
                  }}
                  onView={() => {}} // No action needed, already on bag page
                  onLike={async () => {}} // No like action in edit view
                  onFollow={async () => {}} // No follow action in edit view
                  isLiked={false}
                  isFollowing={false}
                  currentUserId={user?.id}
                />
              </div>
              
              {/* Badges - 2x3 grid on right */}
              <div className="flex-shrink-0 w-full lg:w-56">
                <div className="h-full bg-gray-900/50 rounded-lg p-4 border border-white/10">
                  <BadgeDisplay
                    badges={userBadges}
                    size="lg"
                    showEmpty={true}
                    maxDisplay={6}
                    onBadgeClick={(badge) => {
                      console.log('Badge clicked:', badge);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Equipment Buttons */}
        {isEditing && (
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Button onClick={() => setEquipmentSelectorOpen(true)} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Add Equipment
            </Button>
            {bagItems.length < 10 && (
              <Button onClick={autoFillBag} size="lg" variant="outline">
                <Zap className="w-5 h-5 mr-2" />
                Auto-Fill Bag
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <BagSelectorDialog
        isOpen={showBagSelector}
        onClose={() => setShowBagSelector(false)}
        bags={bags}
        onSelectBag={handleSelectBag}
        onCreateNew={() => {
          setShowBagSelector(false);
          setShowCreateBag(true);
        }}
      />

      <CreateBagDialog
        isOpen={showCreateBag}
        onClose={() => setShowCreateBag(false)}
        onCreateBag={handleCreateBag}
      />

      <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><Skeleton className="h-96 w-96" /></div>}>
        <EquipmentSelectorImproved
          isOpen={equipmentSelectorOpen}
          onClose={() => setEquipmentSelectorOpen(false)}
          onSelectEquipment={addEquipment}
        />
      </Suspense>

      {selectedBagEquipment && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><Skeleton className="h-96 w-96" /></div>}>
          <EquipmentEditor
            isOpen={equipmentEditorOpen}
            onClose={() => {
              setEquipmentEditorOpen(false);
              setSelectedBagEquipment(null);
            }}
            equipment={selectedBagEquipment}
            onUpdate={() => loadBagEquipment(currentBag?.id || '')}
          />
        </Suspense>
      )}

      {/* Badge Notification Toast */}
      {newBadges.length > 0 && (
        <BadgeNotificationToast
          badge={newBadges[0]}
          isVisible={true}
          onClose={() => {
            clearNewBadges();
            // Reload badges to show updated progress
            loadUserBadges();
          }}
        />
      )}

    </div>
  );
};

export default MyBagSupabase;