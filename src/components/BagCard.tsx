import { Heart, User } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface BagData {
  id: string;
  title: string;
  owner: string;
  handicap: number;
  totalValue: number;
  clubCount: number;
  likeCount: number;
  image: string;
  isLiked?: boolean;
  isHot?: boolean;
  brands: string[];
}

interface BagCardProps {
  bag: BagData;
}

const BagCard = ({ bag }: BagCardProps) => {
  const [isLiked, setIsLiked] = useState(bag.isLiked || false);
  const [likeCount, setLikeCount] = useState(bag.likeCount);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Convert owner name to username format
  const getUsername = (ownerName: string) => {
    return ownerName.toLowerCase().replace(/\s+/g, '_');
  };

  return (
    <motion.div
      className="masonry-item"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link to={`/bag/${getUsername(bag.owner)}`} className="block">
        <div className="luxury-card bg-card rounded-xl shadow-card overflow-hidden cursor-pointer group border border-border/10">
        {/* Image Container */}
        <div className="relative overflow-hidden">
          <img
            src={bag.image}
            alt={bag.title}
            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Equipment Details on Hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="text-center text-white">
              <div className="text-sm font-medium mb-1">Featured Equipment</div>
              <div className="text-xs">
                {bag.brands.join(" • ")}
              </div>
            </div>
          </div>
          
          {/* Top Row: Hot Badge and Like Button */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            {bag.isHot && (
              <Badge 
                variant="destructive"
                className="bg-red-500 text-white border-0 shadow-sm font-semibold text-xs flex items-center gap-1"
              >
                🔥 HOT
              </Badge>
            )}
            {!bag.isHot && <div />}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full bg-card/90 backdrop-blur-sm shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-card hover:scale-110"
              onClick={handleLike}
            >
              <Heart 
                className={`w-4 h-4 transition-colors duration-200 ${
                  isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                }`} 
              />
            </Button>
          </div>

          {/* Value Badge */}
          <Badge 
            variant="default"
            className="absolute bottom-3 left-3 bg-primary text-primary-foreground shadow-sm font-display font-bold"
          >
            {formatValue(bag.totalValue)}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors duration-200">
            {bag.title}
          </h3>

          {/* Owner Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8 shadow-sm">
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm text-foreground">{bag.owner}</p>
                <p className="text-xs text-muted-foreground">
                  {bag.handicap > 0 ? `+${bag.handicap}` : bag.handicap} handicap
                </p>
              </div>
            </div>
            
            {/* Handicap Badge */}
            <Badge 
              variant="outline"
              className="bg-accent text-accent-foreground border-accent/30 font-bold text-xs"
            >
              {bag.handicap > 0 ? `+${bag.handicap}` : bag.handicap}
            </Badge>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                <span>{bag.clubCount} clubs</span>
              </span>
              <span className="flex items-center space-x-1">
                <Heart className="w-3 h-3" />
                <span>{likeCount}</span>
              </span>
            </div>
          </div>
        </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default BagCard;