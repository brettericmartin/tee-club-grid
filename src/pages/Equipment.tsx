import { useState } from "react";
import { Grid, List, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { realGolfEquipment } from "@/utils/realEquipmentData";

const Equipment = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');

  // Use real equipment data from database
  const allEquipment = realGolfEquipment.map(item => ({
    ...item,
    price: item.msrp,
    image: item.image_url,
    rating: 4.5 + Math.random() * 0.5, // Random rating between 4.5-5.0
    reviews: Math.floor(Math.random() * 300) + 50, // Random reviews 50-350
    inBags: Math.floor(Math.random() * 1000) + 100 // Random bag count 100-1100
  }));

  const categories = ['all', 'driver', 'mini_driver', 'fairway_wood', 'hybrid', 'irons', 'wedges', 'putter', 'balls', 'glove', 'bag', 'tees', 'speaker', 'rangefinder'];
  const brands = ['all', 'TaylorMade', 'Titleist', 'Callaway', 'PING', 'Scotty Cameron', 'Cleveland', 'Odyssey', 'Bridgestone', 'FootJoy', 'Tour Edge', 'Pride', 'Zero Friction', 'Champ', 'Martini', 'Bushnell', 'Blue Tees', 'JBL', 'Ultimate Ears', 'Garmin', 'Precision Pro', 'Nikon'];

  const filteredEquipment = allEquipment.filter(item => 
    category === 'all' || item.category === category
  );

  const EquipmentGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {filteredEquipment.map(item => (
        <Card key={item.id} className="hover:shadow-card transition-all duration-200">
          <CardContent className="p-0">
            <div className="aspect-square bg-background p-4 relative">
              <img 
                src={item.image}
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
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">{item.brand}</h3>
                <p className="text-sm text-muted-foreground">{item.model}</p>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">${item.price}</span>
                <span className="text-muted-foreground">{item.inBags} bags</span>
              </div>
              
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">★ {item.rating} ({item.reviews})</span>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                  <Heart className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const EquipmentList = () => (
    <div className="space-y-4">
      {filteredEquipment.map(item => (
        <Card key={item.id} className="hover:shadow-card transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-20 h-20 bg-background p-2 rounded relative flex-shrink-0">
              <img 
                src={item.image}
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
            </div>
            
            <div className="flex-1">
              <h3 className="font-medium">{item.brand} {item.model}</h3>
              <p className="text-muted-foreground text-sm capitalize">{item.category}</p>
              <div className="flex gap-4 mt-1 text-sm">
                <span className="font-bold">${item.price}</span>
                <span className="text-muted-foreground">★ {item.rating} ({item.reviews})</span>
                <span className="text-muted-foreground">{item.inBags} bags</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                View Details
              </Button>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                <Heart className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl mt-16">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-display font-bold">Equipment</h1>
          
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

        {/* Filters */}
        <div className="flex gap-4 mb-6 flex-wrap">
          {/* Category Filter */}
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background"
          >
            <option value="all">All Equipment</option>
            {categories.slice(1).map(cat => (
              <option key={cat} value={cat} className="capitalize">{cat}</option>
            ))}
          </select>

          {/* Sort */}
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>

          {/* Brand Filter */}
          <select className="px-4 py-2 border border-border rounded-lg bg-background">
            <option value="all">All Brands</option>
            {brands.slice(1).map(brand => (
              <option key={brand} value={brand} className="capitalize">{brand}</option>
            ))}
          </select>
        </div>

        {/* Equipment Display */}
        {view === 'grid' ? <EquipmentGrid /> : <EquipmentList />}
      </div>
    </div>
  );
};

export default Equipment;