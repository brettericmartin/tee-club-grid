import { useState, useEffect } from "react";
import { Grid, List, Heart, Camera, Loader2, Filter, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEquipment, getUserSavedEquipment } from "@/services/equipment";
import { useAuth } from "@/contexts/AuthContext";
import { toggleEquipmentSave } from "@/services/equipment";
import { useToast } from "@/hooks/use-toast";
import EquipmentDataInfo from "@/components/EquipmentDataInfo";
import { Checkbox } from "@/components/ui/checkbox";
import { EQUIPMENT_CATEGORIES, CATEGORY_DISPLAY_NAMES } from "@/lib/equipment-categories";
import EquipmentCard from "@/components/shared/EquipmentCard";
import SubmitEquipmentModal from "@/components/SubmitEquipmentModal";

const Equipment = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
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
  const itemsPerPage = 20;
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadEquipment();
  }, [category, sortBy]);

  useEffect(() => {
    if (user && showSavedOnly) {
      loadSavedEquipment();
    }
  }, [user, showSavedOnly]);

  useEffect(() => {
    filterEquipment();
  }, [brand, showSavedOnly, allEquipment, savedItems]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [category, sortBy, brand, showSavedOnly]);

  const loadEquipment = async () => {
    console.log('loadEquipment called');
    setLoading(true);
    try {
      const data = await getEquipment({
        category: category === 'all' ? undefined : category,
        sortBy: sortBy === 'popular' ? 'newest' : sortBy // Change 'popular' to 'newest' for now since we don't have likes data
      });
      console.log('Equipment data received:', data);
      setAllEquipment(data || []);
      
      // Extract unique brands
      const uniqueBrands = Array.from(new Set(data?.map(item => item.brand) || [])).sort();
      setBrands(uniqueBrands);
      
      // Load saved items if user is logged in
      if (user) {
        const saved = await getUserSavedEquipment(user.id);
        setSavedItems(new Set(saved?.map(item => item.id) || []));
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
      setSavedItems(new Set(saved?.map(item => item.id) || []));
    } catch (error) {
      console.error('Error loading saved equipment:', error);
    }
  };

  const filterEquipment = () => {
    let filtered = allEquipment;
    
    // Filter by brand
    if (brand !== 'all') {
      filtered = filtered.filter(item => item.brand === brand);
    }
    
    // Filter by saved only
    if (showSavedOnly && user) {
      filtered = filtered.filter(item => savedItems.has(item.id));
    }
    
    setEquipment(filtered);
  };

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
        description: "Please sign in to save equipment to your favorites."
      });
      return;
    }

    try {
      const isSaved = await toggleEquipmentSave(user.id, equipmentId);
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

  const handleEquipmentSubmit = (equipment: any) => {
    // TODO: Implement actual submission to database
    console.log('Equipment submitted:', equipment);
    toast({
      title: "Equipment Submitted",
      description: "Thank you for your contribution! We'll review and add it to our database.",
    });
  };

  const EquipmentGrid = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (equipment.length === 0) {
      return (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No equipment found</p>
        </div>
      );
    }

    return (
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
    );
  };

  const EquipmentList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (equipment.length === 0) {
      return (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No equipment found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {equipment.map(item => (
          <EquipmentCard
            key={item.id}
            equipment={item}
            variant="list"
            isSaved={savedItems.has(item.id)}
            onSaveToggle={(e) => handleSaveToggle(e, item.id)}
            onViewDetails={() => navigate(`/equipment/${item.id}`)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Show info if no equipment loaded - removed since we have data */}
        
        {/* Filters and View Bar */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            {/* Category Filter */}
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background"
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
              className="px-4 py-2 border border-border rounded-lg bg-background"
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
              className="px-4 py-2 border border-border rounded-lg bg-background"
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
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Saved items only
                </label>
              </div>
            )}
          </div>
          
          {/* View Toggle and Submit Button */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSubmitModal(true)}
              className="ml-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Submit Equipment</span>
              <span className="sm:hidden">Add</span>
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
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, equipment.length)} of {equipment.length} items
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-3 text-sm">
                    Page {currentPage} of {Math.ceil(equipment.length / itemsPerPage)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(equipment.length / itemsPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(equipment.length / itemsPerPage)}
                  >
                    Next
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {equipment.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(item => (
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