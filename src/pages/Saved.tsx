import { useState } from "react";
import { Grid, List, Heart, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";

const Saved = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'in-bag' | 'wishlist'>('all');

  // Mock saved equipment data
  const savedEquipment = [
    {
      id: '1',
      brand: 'TaylorMade',
      model: 'Stealth 2 Driver',
      category: 'drivers',
      price: 599,
      rating: 4.7,
      reviews: 234,
      image: '/api/placeholder/300/300',
      savedDate: '2024-01-15',
      inBag: true
    },
    {
      id: '2',
      brand: 'Titleist',
      model: 'T100 Irons',
      category: 'irons',
      price: 1400,
      rating: 4.8,
      reviews: 189,
      image: '/api/placeholder/300/300',
      savedDate: '2024-01-12',
      inBag: false
    },
    {
      id: '3',
      brand: 'Scotty Cameron',
      model: 'Newport 2',
      category: 'putters',
      price: 429,
      rating: 4.9,
      reviews: 156,
      image: '/api/placeholder/300/300',
      savedDate: '2024-01-10',
      inBag: false
    }
  ];

  // Mock followed bags data
  const followedBags = [
    {
      username: 'jordan_mitchell',
      displayName: 'Jordan Mitchell',
      handicap: 2.4,
      bagValue: 8500,
      avatar: '/api/placeholder/80/80'
    },
    {
      username: 'sarah_chen',
      displayName: 'Sarah Chen',
      handicap: 5.8,
      bagValue: 6200,
      avatar: '/api/placeholder/80/80'
    }
  ];

  const inBagCount = savedEquipment.filter(item => item.inBag).length;
  const wishlistCount = savedEquipment.filter(item => !item.inBag).length;

  const filteredEquipment = savedEquipment.filter(item => {
    if (filter === 'in-bag') return item.inBag;
    if (filter === 'wishlist') return !item.inBag;
    return true;
  });

  const SavedEquipmentGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {filteredEquipment.map(item => (
        <Card key={item.id} className="hover:shadow-card transition-all duration-200">
          <CardContent className="p-0">
            <div className="aspect-square bg-background p-4 relative">
              <img 
                src={item.image} 
                alt={`${item.brand} ${item.model}`}
                className="w-full h-full object-contain"
              />
              {item.inBag && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  In Bag
                </div>
              )}
            </div>
            
            <div className="p-3">
              <h3 className="font-medium text-sm">{item.brand}</h3>
              <p className="text-muted-foreground text-sm">{item.model}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold">${item.price}</span>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive p-1">
                  <Heart className="w-4 h-4 fill-current" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const SavedEquipmentList = () => (
    <div className="space-y-2">
      {filteredEquipment.map(item => (
        <Card key={item.id} className="hover:shadow-card transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-4">
            <img 
              src={item.image}
              alt={`${item.brand} ${item.model}`}
              className="w-20 h-20 object-contain"
            />
            
            <div className="flex-1">
              <h3 className="font-medium">{item.brand} {item.model}</h3>
              <p className="text-muted-foreground text-sm capitalize">{item.category} • Saved {item.savedDate}</p>
              <div className="flex gap-4 mt-1 text-sm">
                <span className="font-bold">${item.price}</span>
                {item.inBag && <span className="text-primary">✓ In Bag</span>}
                <span className="text-muted-foreground">★ {item.rating} ({item.reviews})</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                View
              </Button>
              {!item.inBag && (
                <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
                  Add to Bag
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const FollowedBagsGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {followedBags.map(bag => (
        <Card key={bag.username} className="hover:shadow-card transition-all duration-200">
          <CardContent className="p-6">
            <Link to={`/bag/${bag.username}`} className="block">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {bag.displayName.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-foreground">{bag.displayName}</h3>
                  <p className="text-sm text-muted-foreground">{bag.handicap} HCP</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">${bag.bagValue.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">Total Value</span>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-primary">{savedEquipment.length}</p>
              <p className="text-muted-foreground">Saved Items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-primary">{inBagCount}</p>
              <p className="text-muted-foreground">In My Bag</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-primary">{followedBags.length}</p>
              <p className="text-muted-foreground">Following</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="equipment" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="equipment">Saved Equipment</TabsTrigger>
            <TabsTrigger value="bags">Following Bags</TabsTrigger>
          </TabsList>
          
          <TabsContent value="equipment">
            {/* Equipment Filters */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All Saved ({savedEquipment.length})
                </Button>
                <Button
                  variant={filter === 'in-bag' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('in-bag')}
                >
                  In My Bag ({inBagCount})
                </Button>
                <Button
                  variant={filter === 'wishlist' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('wishlist')}
                >
                  Wishlist ({wishlistCount})
                </Button>
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

            {/* Saved Equipment Grid/List */}
            {view === 'grid' ? <SavedEquipmentGrid /> : <SavedEquipmentList />}
          </TabsContent>

          <TabsContent value="bags">
            <FollowedBagsGrid />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Saved;