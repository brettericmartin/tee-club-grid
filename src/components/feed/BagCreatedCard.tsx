import { Heart, MessageCircle, Share2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface BagCreatedCardProps {
  post: any;
  onLike: () => void;
  isLiked: boolean;
}

export function BagCreatedCard({ post, onLike, isLiked }: BagCreatedCardProps) {
  const navigate = useNavigate();
  const bag = post.user_bags;
  
  if (!bag) return null;

  // Calculate total value
  const totalValue = bag.bag_equipment?.reduce((sum: number, item: any) => 
    sum + (item.purchase_price || item.equipment?.msrp || 0), 0
  ) || 0;

  // Get featured equipment (first 6)
  const featuredEquipment = bag.bag_equipment?.slice(0, 6) || [];
  
  // Get unique brands
  const brands = [...new Set(bag.bag_equipment?.map((item: any) => item.equipment?.brand).filter(Boolean))];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.3)] overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.profiles?.avatar_url} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {post.profiles?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white">
                {post.profiles?.display_name || post.profiles?.username} created a new bag
              </p>
              <p className="text-xs text-white/70">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bag Card Preview */}
      <div 
        className="p-6 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => navigate(`/bag/${bag.id}`)}
      >
        {/* Bag Info */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-1">{bag.name}</h3>
          {bag.description && (
            <p className="text-white/70 text-sm">{bag.description}</p>
          )}
          
          {/* Stats */}
          <div className="flex items-center gap-4 mt-3">
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
              ${totalValue.toLocaleString()}
            </Badge>
            <span className="text-white/70 text-sm">
              {bag.bag_equipment?.length || 0} items
            </span>
            {post.profiles?.handicap !== null && (
              <span className="text-white/70 text-sm">
                {post.profiles.handicap > 0 ? '+' : ''}{post.profiles.handicap} handicap
              </span>
            )}
          </div>
        </div>

        {/* Equipment Preview Grid */}
        {featuredEquipment.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {featuredEquipment.map((item: any) => (
              <div 
                key={item.id}
                className="bg-white/5 rounded-lg p-3 text-center"
              >
                <p className="text-xs font-medium text-white truncate">
                  {item.equipment?.brand}
                </p>
                <p className="text-xs text-white/70 truncate">
                  {item.equipment?.model}
                </p>
                <p className="text-xs text-white/50 capitalize">
                  {item.equipment?.category.replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Brands */}
        {brands.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {brands.slice(0, 5).map((brand, i) => (
              <Badge 
                key={i} 
                variant="outline" 
                className="bg-white/5 text-white/70 border-white/20 text-xs"
              >
                {brand}
              </Badge>
            ))}
            {brands.length > 5 && (
              <Badge 
                variant="outline" 
                className="bg-white/5 text-white/70 border-white/20 text-xs"
              >
                +{brands.length - 5} more
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 bg-black/20 backdrop-blur-sm border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
              className={`${isLiked ? 'text-red-500' : 'text-white/70'} hover:text-white`}
            >
              <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              {post.likes_count || 0}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              {post.comments_count || 0}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/bag/${bag.id}`)}
              className="text-white/70 hover:text-white"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Bag
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}