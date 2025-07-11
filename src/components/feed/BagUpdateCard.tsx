import { useState } from 'react';
import { Heart, MessageCircle, Share2, Plus, Minus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface BagUpdateCardProps {
  post: any;
  onLike: () => void;
  isLiked: boolean;
}

export function BagUpdateCard({ post, onLike, isLiked }: BagUpdateCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();
  
  const metadata = post.metadata || {};
  const addedEquipment = metadata.added_equipment || [];
  const removedEquipment = metadata.removed_equipment || [];
  const bag = post.user_bags;

  // Calculate total value
  const totalValue = bag?.bag_equipment?.reduce((sum: number, item: any) => 
    sum + (item.purchase_price || item.equipment?.msrp || 0), 0
  ) || 0;

  return (
    <motion.div 
      className="relative h-[400px] w-full preserve-3d"
      animate={{ rotateY: isFlipped ? 180 : 0 }}
      transition={{ duration: 0.6 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Front - Update Summary */}
      <div 
        className="absolute inset-0 w-full h-full backface-hidden"
        style={{ backfaceVisibility: 'hidden' }}
      >
        <div className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.3)] overflow-hidden h-full">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 cursor-pointer" onClick={() => navigate(`/bag/${post.bag_id}`)}>
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {post.profiles?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-white">
                    {post.profiles?.display_name || post.profiles?.username}
                  </p>
                  <p className="text-xs text-white/70">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFlipped(true)}
                className="text-white/70 hover:text-white"
              >
                View Bag
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Update Content */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {post.content || 'Updated bag'}
            </h3>

            {/* Equipment Changes */}
            <div className="space-y-4">
              {addedEquipment.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Added</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {addedEquipment.map((item: any, i: number) => (
                      <div 
                        key={i}
                        className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => navigate(`/equipment/${item.id}`)}
                      >
                        <p className="font-medium text-white text-sm">{item.brand}</p>
                        <p className="text-white/70 text-xs">{item.model}</p>
                        <p className="text-white/50 text-xs capitalize">{item.category.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {removedEquipment.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <Minus className="w-4 h-4" />
                    <span className="text-sm font-medium">Removed</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {removedEquipment.map((item: any, i: number) => (
                      <div 
                        key={i}
                        className="bg-white/5 rounded-lg p-3 opacity-60"
                      >
                        <p className="font-medium text-white text-sm line-through">{item.brand}</p>
                        <p className="text-white/70 text-xs">{item.model}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/20 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLike}
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
      </div>

      {/* Back - Full Bag View */}
      <div 
        className="absolute inset-0 w-full h-full backface-hidden rotate-y-180"
        style={{ 
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)'
        }}
      >
        <div className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.3)] overflow-hidden h-full">
          {/* Bag Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{bag?.name}</h3>
                <p className="text-sm text-white/70">{bag?.description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFlipped(false)}
                className="text-white/70 hover:text-white"
              >
                Back
              </Button>
            </div>
          </div>

          {/* Equipment Grid */}
          <div className="p-4 overflow-y-auto max-h-[280px]">
            <div className="grid grid-cols-3 gap-2">
              {bag?.bag_equipment?.slice(0, 12).map((item: any) => (
                <div 
                  key={item.id}
                  className="bg-white/5 rounded-lg p-2 text-center hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => navigate(`/equipment/${item.equipment.id}`)}
                >
                  <p className="text-xs font-medium text-white truncate">
                    {item.equipment.brand}
                  </p>
                  <p className="text-xs text-white/70 truncate">
                    {item.equipment.model}
                  </p>
                </div>
              ))}
            </div>
            {bag?.bag_equipment?.length > 12 && (
              <p className="text-center text-white/50 text-sm mt-2">
                +{bag.bag_equipment.length - 12} more items
              </p>
            )}
          </div>

          {/* Bag Stats */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/20 backdrop-blur-sm">
            <div className="flex justify-between text-sm">
              <div className="text-center">
                <p className="text-primary font-bold">${totalValue.toLocaleString()}</p>
                <p className="text-white/50 text-xs">Total Value</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">{bag?.bag_equipment?.length || 0}</p>
                <p className="text-white/50 text-xs">Items</p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/bag/${post.bag_id}`)}
                className="bg-primary hover:bg-primary/90"
              >
                View Full Bag
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}