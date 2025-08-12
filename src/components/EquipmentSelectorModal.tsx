import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, Plus, Filter, Loader2, ChevronRight } from "lucide-react";
import { getEquipment, searchEquipment as searchEquipmentAPI } from "@/services/equipment";
import type { Database } from "@/lib/supabase";
import { EQUIPMENT_CATEGORIES, CATEGORY_DISPLAY_NAMES } from "@/lib/equipment-categories";

type Equipment = Database['public']['Tables']['equipment']['Row'];

interface EquipmentSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (equipment: Equipment) => void;
  onSubmitNew?: () => void;
  category?: string;
}

const EquipmentSelectorModal = ({ open, onClose, onSelect, onSubmitNew, category }: EquipmentSelectorModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(category || "all");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]); // Store all equipment
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: "all", name: "All Equipment" },
    ...Object.values(EQUIPMENT_CATEGORIES).map(category => ({
      id: category,
      name: CATEGORY_DISPLAY_NAMES[category]
    }))
  ];

  // Get unique brands and years from all equipment (not filtered)
  const brands = [...new Set(allEquipment.map(e => e.brand))].sort();
  const years = [...new Set(allEquipment.map(e => e.release_date ? new Date(e.release_date).getFullYear() : null).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0));

  // Load all equipment when modal opens
  useEffect(() => {
    if (open) {
      loadAllEquipment();
    }
  }, [open]);

  // Filter equipment when filters change
  useEffect(() => {
    if (allEquipment.length > 0) {
      filterEquipment();
    }
  }, [allEquipment, selectedCategory, selectedBrand, selectedYear, searchQuery]);

  const loadAllEquipment = async () => {
    setLoading(true);
    try {
      const data = await getEquipment({ category: selectedCategory !== "all" ? selectedCategory : undefined });
      setAllEquipment(data || []);
    } catch (error) {
      console.error('Error loading equipment:', error);
      setAllEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  const filterEquipment = () => {
    let filtered = [...allEquipment];
    
    // Apply brand filter
    if (selectedBrand) {
      filtered = filtered.filter(item => item.brand === selectedBrand);
    }
    
    // Apply year filter
    if (selectedYear) {
      filtered = filtered.filter(item => {
        const itemYear = item.release_date ? new Date(item.release_date).getFullYear().toString() : null;
        return itemYear === selectedYear;
      });
    }
    
    // Apply search
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.brand.toLowerCase().includes(searchLower) ||
        item.model.toLowerCase().includes(searchLower)
      );
    }
    
    setEquipment(filtered);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      setLoading(true);
      try {
        const results = await searchEquipmentAPI(query);
        setEquipment(results || []);
      } catch (error) {
        console.error('Error searching equipment:', error);
      } finally {
        setLoading(false);
      }
    } else if (!query) {
      filterEquipment(); // Use local filtering instead of reloading
    }
  };

  const clearFilters = () => {
    setSelectedBrand("");
    setSelectedYear("");
    setSearchQuery("");
    setSelectedCategory("all");
  };

  const hasActiveFilters = selectedBrand || selectedYear || searchQuery || selectedCategory !== "all";

  // Breadcrumb navigation handlers
  const handleBreadcrumbClick = (type: 'category' | 'brand' | 'year') => {
    switch (type) {
      case 'category':
        setSelectedCategory("all");
        setSelectedBrand("");
        setSelectedYear("");
        break;
      case 'brand':
        setSelectedBrand("");
        setSelectedYear("");
        break;
      case 'year':
        setSelectedYear("");
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-full sm:max-w-4xl h-full sm:h-auto max-h-[100vh] sm:max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 flex-shrink-0">
          <DialogTitle className="text-2xl">Select Equipment</DialogTitle>
        </DialogHeader>

        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4 overflow-y-auto max-h-[calc(100vh-80px)] sm:max-h-[calc(90vh-80px)]">
          {/* Breadcrumb Navigation */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleBreadcrumbClick('category')}
              >
                All Equipment
              </span>
              {selectedCategory !== "all" && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span 
                    className="cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleBreadcrumbClick('category')}
                  >
                    {categories.find(c => c.id === selectedCategory)?.name}
                  </span>
                </>
              )}
              {selectedBrand && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span 
                    className="cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleBreadcrumbClick('brand')}
                  >
                    {selectedBrand}
                  </span>
                </>
              )}
              {selectedYear && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span 
                    className="cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleBreadcrumbClick('year')}
                  >
                    {selectedYear}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by brand or model..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-primary text-primary-foreground" : ""}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedCategory !== "all" && (
                <Badge variant="secondary">
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSelectedCategory("all")} />
                </Badge>
              )}
              {selectedBrand && (
                <Badge variant="secondary">
                  {selectedBrand}
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSelectedBrand("")} />
                </Badge>
              )}
              {selectedYear && (
                <Badge variant="secondary">
                  {selectedYear}
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSelectedYear("")} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}

          {/* Filter Panel */}
          {showFilters && (
            <div className="border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4 bg-muted/20">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Brand</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    size={1}
                    style={{ maxHeight: '150px' }}
                  >
                    <option value="">All Brands</option>
                    {brands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Year</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    size={1}
                    style={{ maxHeight: '150px' }}
                  >
                    <option value="">All Years</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="w-max min-w-full justify-start flex-nowrap">
                {categories.map(cat => (
                  <TabsTrigger key={cat.id} value={cat.id} className="whitespace-nowrap">
                    {cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value={selectedCategory} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : equipment.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No equipment found</p>
                  {onSubmitNew && (
                    <Button onClick={onSubmitNew} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Submit New Equipment
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2">
                  {equipment.map((item) => (
                    <Card 
                      key={item.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onSelect(item)}
                    >
                      <CardContent className="p-2 sm:p-4">
                        <div className="aspect-square mb-3 bg-muted rounded-md overflow-hidden">
                          <img 
                            src={item.image_url || '/api/placeholder/200/200'} 
                            alt={`${item.brand} ${item.model}`}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <h4 className="font-medium text-sm">{item.brand}</h4>
                        <p className="text-sm text-muted-foreground">{item.model}</p>
                        {item.release_date && (
                          <p className="text-xs text-muted-foreground mt-1">{new Date(item.release_date).getFullYear()}</p>
                        )}
                        {item.msrp && (
                          <p className="text-sm font-medium mt-2">${item.msrp}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Submit New Equipment Option */}
          {onSubmitNew && equipment.length > 0 && (
            <div className="flex justify-center pt-4 border-t">
              <Button onClick={onSubmitNew} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Can't find what you're looking for? Submit new equipment
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentSelectorModal;