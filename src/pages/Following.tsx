import { Star, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { Link } from "react-router-dom";

const Following = () => {
  // Mock data for followed bags
  const followedBags = [
    {
      username: 'jordan_mitchell',
      displayName: 'Jordan Mitchell',
      handicap: 2.4,
      bagValue: 8500,
      featuredEquipment: ['TaylorMade Stealth 2', 'Titleist T100', 'Scotty Newport 2'],
      lastUpdated: '2 days ago',
      avatar: '/api/placeholder/80/80'
    },
    {
      username: 'sarah_chen',
      displayName: 'Sarah Chen',
      handicap: 5.8,
      bagValue: 6200,
      featuredEquipment: ['Ping G430', 'Callaway Apex CB', 'Vokey SM10'],
      lastUpdated: '1 week ago',
      avatar: '/api/placeholder/80/80'
    },
    {
      username: 'mike_torres',
      displayName: 'Mike Torres',
      handicap: 12.3,
      bagValue: 3800,
      featuredEquipment: ['Cobra Darkspeed', 'Wilson D9', 'Odyssey AI-One'],
      lastUpdated: '3 days ago',
      avatar: '/api/placeholder/80/80'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl mt-16">
        <h1 className="text-3xl font-display font-bold mb-8">Bags I Follow</h1>
        
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
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">${bag.bagValue.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">Total Value</span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Featured Equipment:</p>
                      {bag.featuredEquipment.map((item, i) => (
                        <div key={i} className="text-sm text-foreground flex items-center gap-1">
                          <Star className="w-3 h-3 text-accent" />
                          {item}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t border-border">
                      <Calendar className="w-3 h-3" />
                      Updated {bag.lastUpdated}
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Following;