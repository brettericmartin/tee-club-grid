import { useState, useEffect } from "react";
import { Heart, Camera, Loader2, Filter, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEquipment, getUserSavedEquipment } from "@/services/equipment";
import { useAuth } from "@/contexts/AuthContext";
import { toggleEquipmentSave } from "@/services/equipment";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import EquipmentDataInfo from "@/components/EquipmentDataInfo";
import { Checkbox } from "@/components/ui/checkbox";
import { EQUIPMENT_CATEGORIES, CATEGORY_DISPLAY_NAMES } from "@/lib/equipment-categories";
import EquipmentCard from "@/components/shared/EquipmentCard";
import SubmitEquipmentModal from "@/components/SubmitEquipmentModal";

const Equipment = () => {
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'price-low' | 'price-high'>('popular');
  const [brand, setBrand] = useState('all');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [allEquipment, setAllEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50; // Items per page for server-side pagination
  
  const navigate = useNavigate();
  const { user, loading: authLoading, initialized } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Load equipment immediately - page is public
    console.log('[Equipment] useEffect running, calling loadEquipment with category:', category, 'sortBy:', sortBy, 'page:', currentPage);
    loadEquipment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sortBy, currentPage, brand]); // Added currentPage and brand to dependencies

  useEffect(() => {
    // Load all unique brands on mount
    loadAllBrands();
  }, []);

  useEffect(() => {
    // Only load saved equipment if user is logged in
    if (user && initialized) {
      if (showSavedOnly) {
        loadSavedEquipment();
      } else {
        // Load saved items in background if user is logged in
        loadSavedEquipment();
      }
    }
  }, [user, showSavedOnly, initialized]);

  // Removed filterEquipment useEffect - now handled by server-side pagination

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [category, sortBy, brand, showSavedOnly]);

  const loadAllBrands = async () => {
    try {
      // Get all unique brands from the database
      const { data, error } = await supabase
        .from('equipment')
        .select('brand')
        .order('brand');
      
      if (!error && data) {
        const uniqueBrands = Array.from(new Set(data.map(item => item.brand).filter(Boolean))).sort();
        setBrands(uniqueBrands);
        console.log('[Equipment] Loaded', uniqueBrands.length, 'unique brands');
      }
    } catch (error) {
      console.error('[Equipment] Error loading brands:', error);
    }
  };

  const loadEquipment = async () => {
    console.log('[Equipment] loadEquipment called with category:', category, 'sortBy:', sortBy, 'page:', currentPage);
    
    setLoading(true);
    try {
      // First, get the total count for pagination
      // IMPORTANT: Don't use head: true as it can cause queries to hang
      let countQuery = supabase
        .from('equipment')
        .select('id', { count: 'exact' });  // Select minimal field for count
      
      // Apply filters to count query
      if (category && category !== 'all') {
        countQuery = countQuery.eq('category', category);
      }
      if (brand && brand !== 'all') {
        countQuery = countQuery.eq('brand', brand);
      }
      
      const { data: countData, count, error: countError } = await countQuery;
      
      if (countError) {
        console.error('[Equipment] Count query error:', countError);
        throw countError;
      }
      
      console.log('[Equipment] Count result:', count);
      setTotalCount(count || 0);
      
      // Now get the actual data for the current page
      console.log('[Equipment] Starting data query...');
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      let query = supabase
        .from('equipment')
        .select('*')
        .range(from, to); // Server-side pagination
      
      // Apply category filter
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      
      // Apply brand filter
      if (brand && brand !== 'all') {
        query = query.eq('brand', brand);
      }
      
      // Apply sorting
      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'price-low') {
        query = query.order('msrp', { ascending: true, nullsFirst: true }); // Handle nulls properly
      } else if (sortBy === 'price-high') {
        query = query.order('msrp', { ascending: false, nullsFirst: false }); // Handle nulls properly
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Equipment] Error loading equipment:', error);
        setAllEquipment([]);
        toast({
          title: "Error",
          description: "Failed to load equipment. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('[Equipment] Equipment data received:', data?.length || 0, 'items');
      setEquipment(data || []); // Set equipment directly - this is just the current page
      setAllEquipment(data || []); // Keep for backward compatibility
      
      // Load saved items in background if user is logged in (non-blocking)
      if (user) {
        getUserSavedEquipment(user.id).then(saved => {
          console.log('Saved equipment data:', saved);
          const savedIds = saved?.map(item => item.id).filter(Boolean) || [];
          console.log('Saved equipment IDs:', savedIds);
          setSavedItems(new Set(savedIds));
        }).catch(error => {
          console.error('Error loading saved equipment:', error);
          // Don't show error to user - saved items are optional
        });
      }
    } catch (error) {
      console.error('Error loading equipment:', error);
      toast({
        title: "Error",
        description: "Failed to load equipment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSavedEquipment = async () => {
    if (!user) return;
    try {
      const saved = await getUserSavedEquipment(user.id);
      console.log('loadSavedEquipment - Saved data:', saved);
      
      // getUserSavedEquipment returns equipment objects with their IDs at the top level
      const savedIds = saved?.map(item => item.id).filter(Boolean) || [];
      console.log('loadSavedEquipment - Saved IDs:', savedIds);
      setSavedItems(new Set(savedIds));
    } catch (error) {
      console.error('Error loading saved equipment:', error);
      toast({
        title: "Error",
        description: "Failed to load saved items.",
        variant: "destructive"
      });
    }
  };

  // Removed filterEquipment - now handled by server-side filtering in loadEquipment

  // Categories from our standardized list
  const categoryOptions = Object.entries(EQUIPMENT_CATEGORIES).map(([key, value]) => ({
    value,
    label: CATEGORY_DISPLAY_NAMES[value]
  }));

  const handleSaveToggle = async (e: React.MouseEvent, equipmentId: string) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save equipment to your favorites.",
        variant: "default"
      });
      return;
    }

    try {
      console.log('Toggling save for equipment:', equipmentId);
      const isSaved = await toggleEquipmentSave(user.id, equipmentId);
      console.log('Toggle result - isSaved:', isSaved);
      
      if (isSaved) {
        setSavedItems(prev => new Set(prev).add(equipmentId));
        toast({
          title: "Saved",
          description: "Equipment added to your favorites."
        });
      } else {
        setSavedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(equipmentId);
          return newSet;
        });
        toast({
          title: "Removed",
          description: "Equipment removed from your favorites."
        });
        
        // If we're showing saved only and this was the last item, refresh
        if (showSavedOnly && savedItems.size === 1) {
          loadEquipment(); // Reload from server with filters
        }
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEquipmentSubmit = async (equipment: any) => {
    try {
      // Import and use the community equipment service
      const { submitEquipment } = await import('@/services/communityEquipment');
      
      const result = await submitEquipment({
        brand: equipment.brand,
        model: equipment.model,
        category: equipment.category,
        year: equipment.year,
        msrp: equipment.msrp,
        image_url: equipment.imageUrl,
        specs: equipment.specs
      });
      
      if (result.success && result.equipment) {
        toast({
          title: "Equipment Added Successfully!",
          description: `${equipment.brand} ${equipment.model} has been added to the database.`,
        });
        setShowSubmitModal(false);
        
        // Redirect to equipment detail page where user can upload photos
        navigate(`/equipment/${result.equipment.id}`);
      } else {
        toast({
          title: "Equipment Already Exists",
          description: result.error || "This equipment is already in our database.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting equipment:', error);
      toast({
        title: "Error",
        description: "Failed to submit equipment. Please try again.",
        variant: "destructive"
      });
    }
  };


  // Don't block on auth - equipment page is public

  return (
    <div className="min-h-screen bg-[#111111] pt-20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Show info if no equipment loaded - removed since we have data */}
        
        {/* Filters and Submit Button - All in one row on desktop */}
        <div className="mb-6">
          {/* Desktop: All in one row with filters on left, button on right */}
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            {/* Filters Group */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-wrap lg:flex-nowrap">
              {/* Category Filter */}
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-white/10 rounded-lg bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] transition-colors"
              >
                <option value="all">All Equipment</option>
                {categoryOptions.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              {/* Sort */}
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto px-4 py-2 border border-white/10 rounded-lg bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] transition-colors"
              >
                <option value="popular">Most Liked</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>

              {/* Brand Filter */}
              <select 
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-white/10 rounded-lg bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] transition-colors"
              >
                <option value="all">All Brands</option>
                {brands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Saved Only Checkbox */}
              {user && (
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="saved-only"
                    checked={showSavedOnly}
                    onCheckedChange={(checked) => setShowSavedOnly(checked as boolean)}
                  />
                  <label 
                    htmlFor="saved-only" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-nowrap"
                  >
                    Saved items only
                  </label>
                </div>
              )}
            </div>
            
            {/* Submit Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSubmitModal(true)}
              className="w-full sm:w-auto bg-[#10B981] text-white border-[#10B981] hover:bg-[#0ea674] hover:border-[#0ea674] lg:ml-4 lg:flex-shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Submit Equipment
            </Button>
          </div>
        </div>

        {/* Equipment Display */}
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : equipment.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No equipment found</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} items
                </p>
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                  <span className="flex items-center px-2 sm:px-3 text-sm">
                    Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / itemsPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                  >
                    Next
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {equipment.map(item => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    variant="grid"
                    isSaved={savedItems.has(item.id)}
                    onSaveToggle={(e) => handleSaveToggle(e, item.id)}
                    onViewDetails={() => navigate(`/equipment/${item.id}`)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Submit Equipment Modal */}
      <SubmitEquipmentModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSubmit={handleEquipmentSubmit}
      />
    </div>
  );
};

export default Equipment;