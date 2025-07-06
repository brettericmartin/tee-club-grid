import { useState } from "react";
import { Heart, X, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";

const Wishlist = () => {
  // Sample wishlist items - in real app, this would come from user data
  const [wishlistItems, setWishlistItems] = useState([]);

  const removeFromWishlist = (equipmentId: string) => {
    setWishlistItems(prev => prev.filter(item => item?.id !== equipmentId));
  };

  const totalValue = wishlistItems.reduce((sum, item) => sum + (item?.msrp || 0), 0);

  const categorizeItems = () => {
    const categories = {
      drivers: wishlistItems.filter(item => item?.category === 'driver'),
      woods: wishlistItems.filter(item => item?.category === 'wood'),
      irons: wishlistItems.filter(item => item?.category === 'iron'),
      wedges: wishlistItems.filter(item => item?.category === 'wedge'),
      putters: wishlistItems.filter(item => item?.category === 'putter'),
      accessories: wishlistItems.filter(item => 
        ['ball', 'glove', 'rangefinder', 'bag'].includes(item?.category || '')
      )
    };
    return categories;
  };

  const categories = categorizeItems();

  const EquipmentCard = ({ item, onRemove }: { item: any; onRemove: (id: string) => void }) => (
    <Card className="group luxury-card bg-card hover:shadow-hover transition-all duration-300">
      <CardContent className="p-4">
        <div className="relative">
          <img 
            src={item.image} 
            alt={`${item.brand} ${item.model}`}
            className="w-full h-40 object-contain mb-4 group-hover:scale-105 transition-transform duration-300"
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-card/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onRemove(item.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">{item.brand}</h3>
          <p className="text-xs text-muted-foreground">{item.model}</p>
          <p className="text-sm font-semibold text-primary">${item.msrp.toLocaleString()}</p>
          
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1">
              Add to Bag
            </Button>
            <Button variant="outline" size="sm">
              <Heart className="w-4 h-4 fill-current text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const CategorySection = ({ title, items }: { title: string; items: any[] }) => {
    if (items.length === 0) return null;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <EquipmentCard 
              key={item.id} 
              item={item} 
              onRemove={removeFromWishlist}
            />
          ))}
        </div>
      </div>
    );
  };

  const EmptyState = () => (
    <div className="text-center py-16 space-y-4">
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto">
        <Heart className="w-12 h-12 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2">Your Wishlist is Empty</h3>
        <p className="text-muted-foreground">Start adding equipment you'd love to try</p>
      </div>
      <Button>
        Browse Equipment
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="bg-card rounded-xl shadow-card p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold mb-2">My Wishlist</h1>
              <p className="text-muted-foreground">Equipment you're considering</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold text-lg">${totalValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share Wishlist
              </Button>
            </div>
          </div>
        </div>

        {/* Wishlist Content */}
        <div className="bg-card rounded-xl shadow-card p-8">
          {wishlistItems.length === 0 ? (
            <EmptyState />
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4 max-w-md">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="clubs">Clubs</TabsTrigger>
                <TabsTrigger value="gear">Gear</TabsTrigger>
                <TabsTrigger value="accessories">Accessories</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-8 mt-8">
                <CategorySection title="Drivers" items={categories.drivers} />
                <CategorySection title="Woods & Hybrids" items={categories.woods} />
                <CategorySection title="Irons" items={categories.irons} />
                <CategorySection title="Wedges" items={categories.wedges} />
                <CategorySection title="Putters" items={categories.putters} />
                <CategorySection title="Accessories" items={categories.accessories} />
              </TabsContent>

              <TabsContent value="clubs" className="space-y-8 mt-8">
                <CategorySection title="Drivers" items={categories.drivers} />
                <CategorySection title="Woods & Hybrids" items={categories.woods} />
                <CategorySection title="Irons" items={categories.irons} />
                <CategorySection title="Wedges" items={categories.wedges} />
                <CategorySection title="Putters" items={categories.putters} />
              </TabsContent>

              <TabsContent value="gear" className="mt-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {wishlistItems.map((item) => (
                    <EquipmentCard 
                      key={item?.id} 
                      item={item} 
                      onRemove={removeFromWishlist}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="accessories" className="mt-8">
                <CategorySection title="Accessories" items={categories.accessories} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;