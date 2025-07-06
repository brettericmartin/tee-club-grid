import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, Plus, Filter } from "lucide-react";
import { Equipment } from "@/lib/equipment-types";
import { allEquipment, getEquipmentByCategory, searchEquipment, filterEquipment } from "@/lib/equipment-database";

interface EquipmentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (equipment: Equipment) => void;
  category?: string;
}

const EquipmentSelectorModal = ({ isOpen, onClose, onSelect, category }: EquipmentSelectorModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(category || "all");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { id: "all", name: "All Equipment", count: allEquipment.length },
    { id: "driver", name: "Drivers", count: getEquipmentByCategory("driver").length },
    { id: "iron", name: "Irons", count: getEquipmentByCategory("iron").length },
    { id: "wedge", name: "Wedges", count: getEquipmentByCategory("wedge").length },
    { id: "putter", name: "Putters", count: getEquipmentByCategory("putter").length },
    { id: "ball", name: "Balls", count: getEquipmentByCategory("ball").length },
    { id: "bag", name: "Bags", count: getEquipmentByCategory("bag").length }
  ];

  const brands = [...new Set(allEquipment.map(e => e.brand))].sort();
  const years = [...new Set(allEquipment.map(e => e.year))].sort((a, b) => b - a);

  const getFilteredEquipment = () => {
    let filtered = allEquipment;

    // Apply search
    if (searchQuery) {
      filtered = searchEquipment(searchQuery);
    }

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Apply brand filter
    if (selectedBrand) {
      filtered = filtered.filter(item => item.brand === selectedBrand);
    }

    // Apply year filter
    if (selectedYear) {
      filtered = filtered.filter(item => item.year === parseInt(selectedYear));
    }

    return filtered;
  };

  const filteredEquipment = getFilteredEquipment();

  const EquipmentCard = ({ equipment }: { equipment: Equipment }) => (
    <Card className="group luxury-card bg-card hover:shadow-hover transition-all duration-300 cursor-pointer"
          onClick={() => onSelect(equipment)}>
      <CardContent className="p-4">
        <div className="relative">
          <img 
            src={equipment.image} 
            alt={`${equipment.brand} ${equipment.model}`}
            className="w-full h-40 object-contain mb-4 group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 right-2 flex gap-1">
            {equipment.isVerified ? (
              <Badge variant="default" className="text-xs">Verified</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Community</Badge>
            )}
            {equipment.year >= 2024 && (
              <Badge variant="outline" className="text-xs">New</Badge>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">{equipment.brand}</h3>
          <p className="text-xs text-muted-foreground">{equipment.model}</p>
          <p className="text-xs text-muted-foreground capitalize">{equipment.category} • {equipment.year}</p>
          {equipment.msrp > 0 && (
            <p className="text-sm font-semibold text-primary">${equipment.msrp.toLocaleString()}</p>
          )}
          {equipment.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{equipment.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Select Equipment</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-2 block">Brand</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full p-2 border rounded-md"
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
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedBrand("");
                    setSelectedYear("");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="px-6">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-7">
              {categories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                  {cat.name}
                  <span className="ml-1 text-xs text-muted-foreground">({cat.count})</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Equipment Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredEquipment.length} items
            </p>
          </div>

          {filteredEquipment.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Search className="w-12 h-12 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">No Equipment Found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredEquipment.map((equipment) => (
                <EquipmentCard key={equipment.id} equipment={equipment} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentSelectorModal;