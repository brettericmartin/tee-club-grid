import { MapPin, Share2, UserPlus, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BagHeaderProps {
  userProfile: {
    name: string;
    username: string;
    avatar?: string;
    location?: string;
    handicap: number;
    avgScore?: number;
  };
  bagStats: {
    totalValue: number;
    itemCount: number;
    featuredCount: number;
  };
  isOwnBag: boolean;
  courseImage?: string;
}

const BagHeader = ({ userProfile, bagStats, isOwnBag, courseImage }: BagHeaderProps) => {
  return (
    <div className="relative">
      {/* Course Background */}
      {courseImage && (
        <div className="course-backdrop">
          <img 
            src={courseImage} 
            alt="Course background"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header Content */}
      <header className="sticky top-0 z-20 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 ring-2 ring-white/20">
                <AvatarImage src={userProfile.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-hover text-primary-foreground text-xl font-bold">
                  {userProfile.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-2xl font-bold text-white">{userProfile.name}</h1>
                <p className="text-white/70">@{userProfile.username}</p>
                <div className="flex items-center gap-4 mt-1 text-sm text-white/60">
                  {userProfile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {userProfile.location}
                    </div>
                  )}
                  <span>{userProfile.handicap} HCP</span>
                  {userProfile.avgScore && <span>Avg: {userProfile.avgScore}</span>}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              {isOwnBag ? (
                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Bag
                </Button>
              ) : (
                <Button size="sm" className="bg-primary hover:bg-primary-hover">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Follow
                </Button>
              )}
              <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-8 text-white">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">${bagStats.totalValue.toLocaleString()}</span>
              <span className="text-white/60">Total Value</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{bagStats.itemCount}</span>
              <span className="text-white/60">Items</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{bagStats.featuredCount}</span>
              <span className="text-white/60">Featured</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BagHeader;