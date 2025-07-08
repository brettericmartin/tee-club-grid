import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, Plus, Filter, Loader2 } from "lucide-react";
import { getEquipment, searchEquipment as searchEquipmentAPI } from "@/services/equipment";
import type { Database } from "@/lib/supabase";

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
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: "all", name: "All Equipment" },
    { id: "driver", name: "Drivers" },
    { id: "iron", name: "Irons" },
    { id: "wedge", name: "Wedges" },
    { id: "putter", name: "Putters" },
    { id: "ball", name: "Balls" },
    { id: "bag", name: "Bags" }
  ];

  // Get unique brands and years from equipment
  const brands = [...new Set(equipment.map(e => e.brand))].sort();
  const years = [...new Set(equipment.map(e => e.release_year).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0));

  useEffect(() => {
    if (open) {
      loadEquipment();
    }
  }, [open, selectedCategory, selectedBrand, selectedYear]);

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedCategory !== "all") {
        filters.category = selectedCategory;
      }
      
      const data = await getEquipment(filters);
      
      let filtered = data || [];
      
      // Apply brand filter
      if (selectedBrand) {
        filtered = filtered.filter(item => item.brand === selectedBrand);
      }
      
      // Apply year filter
      if (selectedYear) {
        filtered = filtered.filter(item => item.release_year?.toString() === selectedYear);
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
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
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
      loadEquipment();
    }
  };

  const clearFilters = () => {
    setSelectedBrand("");
    setSelectedYear("");
    setSearchQuery("");
    setSelectedCategory("all");
  };

  const hasActiveFilters = selectedBrand || selectedYear || searchQuery || selectedCategory !== "all";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl">Select Equipment</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
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
            <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Brand</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
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
            <TabsList className="w-full justify-start">
              {categories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id}>
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>

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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
                  {equipment.map((item) => (
                    <Card 
                      key={item.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onSelect(item)}
                    >
                      <CardContent className="p-4">
                        <div className="aspect-square mb-3 bg-muted rounded-md overflow-hidden">
                          <img 
                            src={item.image_url || '/api/placeholder/200/200'} 
                            alt={`${item.brand} ${item.model}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <h4 className="font-medium text-sm">{item.brand}</h4>
                        <p className="text-sm text-muted-foreground">{item.model}</p>
                        {item.release_year && (
                          <p className="text-xs text-muted-foreground mt-1">{item.release_year}</p>
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