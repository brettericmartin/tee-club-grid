import { User } from "lucide-react";
import { motion } from "framer-motion";
import { useState, memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TeedBallLike } from "@/components/shared/TeedBallLike";

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

const BagCard = memo(({ bag }: BagCardProps) => {
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


  return (
    <motion.div
      className="masonry-item"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link to={`/bag/${bag.id}`} className="block">
        <div className="bg-white/10 backdrop-blur-[10px] rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.3)] overflow-hidden cursor-pointer group border border-white/20 hover:bg-white/[0.15] hover:scale-105 transition-[colors,transform] duration-200">
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
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <TeedBallLike
                isLiked={isLiked}
                likeCount={likeCount}
                onLike={handleLike}
                size="sm"
                showCount={false}
                className="bg-white/10 backdrop-blur-sm shadow-sm hover:bg-white/20"
              />
            </div>
          </div>

          {/* Value Badge */}
          <Badge 
            variant="default"
            className="absolute bottom-3 left-3 bg-primary text-white shadow-sm font-display font-bold"
          >
            {formatValue(bag.totalValue)}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="font-display font-semibold text-lg text-white group-hover:text-primary transition-colors duration-200">
            {bag.title}
          </h3>

          {/* Owner Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8 shadow-sm">
                <AvatarImage src={undefined} />
                <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white text-xs">
                  {bag.owner?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm text-white">{bag.owner}</p>
                <p className="text-xs text-white/70">
                  {bag.handicap > 0 ? `+${bag.handicap}` : bag.handicap} handicap
                </p>
              </div>
            </div>
            
            {/* Handicap Badge */}
            <Badge 
              variant="outline"
              className="bg-primary/20 text-primary border-primary/30 font-bold text-xs"
            >
              {bag.handicap > 0 ? `+${bag.handicap}` : bag.handicap}
            </Badge>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center space-x-4 text-sm text-white/70">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                <span>{bag.clubCount} clubs</span>
              </span>
              <TeedBallLike
                isLiked={isLiked}
                likeCount={likeCount}
                onLike={() => {}}
                size="sm"
                showCount={true}
                disabled={true}
                className="text-white/70"
              />
            </div>
          </div>
        </div>
        </div>
      </Link>
    </motion.div>
  );
});

export default BagCard;