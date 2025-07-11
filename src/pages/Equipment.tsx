import { useState, useEffect } from "react";
import { Grid, List, Heart, Camera, Loader2, Filter } from "lucide-react";
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

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const data = await getEquipment({
        category: category === 'all' ? undefined : category,
        sortBy: sortBy === 'popular' ? 'newest' : sortBy // Change 'popular' to 'newest' for now since we don't have likes data
      });
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
          <Card 
            key={item.id} 
            className="hover:shadow-card transition-all duration-200 cursor-pointer"
            onClick={() => navigate(`/equipment/${item.id}`)}
          >
            <CardContent className="p-0">
              <div className="aspect-square bg-background p-4 relative">
                <img 
                  src={item.primaryPhoto || item.image_url}
                  alt={`${item.brand} ${item.model}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div 
                  className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground font-medium text-sm"
                  style={{ display: 'none' }}
                >
                  {item.brand.split(' ').map(word => word[0]).join('')}
                </div>
                {item.equipment_photos && item.equipment_photos.length > 0 && (
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-full flex items-center gap-1 text-xs">
                    <Camera className="w-3 h-3" />
                    <span>{item.equipment_photos.length}</span>
                  </div>
                )}
              </div>
              
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">{item.brand}</h3>
                  <p className="text-sm text-muted-foreground">{item.model}</p>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">${item.msrp}</span>
                  <span className="text-muted-foreground">{item.savesCount || 0} saves</span>
                </div>
                
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/equipment/${item.id}`);
                    }}
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={savedItems.has(item.id) ? "text-primary" : "text-muted-foreground hover:text-primary"}
                    onClick={(e) => handleSaveToggle(e, item.id)}
                  >
                    <Heart className={`w-4 h-4 ${savedItems.has(item.id) ? 'fill-current' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
          <Card 
            key={item.id} 
            className="hover:shadow-card transition-all duration-200 cursor-pointer"
            onClick={() => navigate(`/equipment/${item.id}`)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-20 h-20 bg-background p-2 rounded relative flex-shrink-0">
                <img 
                  src={item.primaryPhoto || item.image_url}
                  alt={`${item.brand} ${item.model}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div 
                  className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground font-medium text-xs rounded"
                  style={{ display: 'none' }}
                >
                  {item.brand.split(' ').map(word => word[0]).join('')}
                </div>
                {item.equipment_photos && item.equipment_photos.length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-black/60 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-xs">
                    <Camera className="w-2.5 h-2.5" />
                    <span>{item.equipment_photos.length}</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium">{item.brand} {item.model}</h3>
                <p className="text-muted-foreground text-sm capitalize">{item.category.replace('_', ' ')}</p>
                <div className="flex gap-4 mt-1 text-sm">
                  <span className="font-bold">${item.msrp}</span>
                  <span className="text-muted-foreground">{item.savesCount || 0} saves</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/equipment/${item.id}`);
                  }}
                >
                  View Details
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={savedItems.has(item.id) ? "text-primary" : "text-muted-foreground hover:text-primary"}
                  onClick={(e) => handleSaveToggle(e, item.id)}
                >
                  <Heart className={`w-4 h-4 ${savedItems.has(item.id) ? 'fill-current' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Show info if no equipment loaded */}
        {equipment.length === 0 && !loading && <EquipmentDataInfo />}
        
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

        {/* Equipment Display */}
        {view === 'grid' ? <EquipmentGrid /> : <EquipmentList />}
      </div>
    </div>
  );
};

export default Equipment;