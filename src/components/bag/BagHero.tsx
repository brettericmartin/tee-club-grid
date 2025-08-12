import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Edit3, Heart, Share2, Trophy, Target } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface BagHeroProps {
  bag: {
    id: string;
    name: string;
    background_image?: string;
    created_at: string;
    updated_at: string;
    likes_count: number;
    profiles: {
      id: string;
      username: string;
      display_name?: string;
      avatar_url?: string;
      handicap?: number;
      location?: string;
      title?: string;
    };
  };
  isOwner: boolean;
  isLiked: boolean;
  onLike: () => void;
}

const BagHero = ({ bag, isOwner, isLiked, onLike }: BagHeroProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const updatedTime = formatDistanceToNow(new Date(bag.updated_at || bag.created_at), {
    addSuffix: true,
  });

  return (
    <div className="relative overflow-hidden">
      {/* Background Image with Parallax */}
      {bag.background_image && (
        <motion.div
          className="absolute inset-0 z-0"
          initial={{ scale: 1.1 }}
          animate={{ scale: imageLoaded ? 1 : 1.1 }}
          transition={{ duration: 0.6 }}
        >
          <img
            src={bag.background_image}
            alt="Bag background"
            className="w-full h-full object-cover"
            onLoad={() => setImageLoaded(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/60 via-emerald-900/80 to-emerald-950" />
        </motion.div>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* User Info */}
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-emerald-500 shadow-2xl">
                <AvatarImage src={bag.profiles.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white text-2xl md:text-3xl">
                  {(bag.profiles.display_name || bag.profiles.username)?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            <div className="flex-1 space-y-4">
              {/* Name and Title */}
              <div>
                <h2 className="text-2xl md:text-3xl font-medium text-emerald-50/90 mb-1">
                  {bag.profiles.display_name || bag.profiles.username}
                </h2>
                {bag.profiles.title && (
                  <p className="text-emerald-200/70">{bag.profiles.title}</p>
                )}
              </div>

              {/* Location and Handicap */}
              <div className="flex flex-wrap items-center gap-4 text-emerald-100/80">
                {bag.profiles.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>{bag.profiles.location}</span>
                  </div>
                )}
                {bag.profiles.handicap !== null && bag.profiles.handicap !== undefined && (
                  <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-500/30">
                    <Target className="w-3 h-3 mr-1" />
                    {bag.profiles.handicap} HCP
                  </Badge>
                )}
              </div>

              {/* Bag Name - Main Heading */}
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-5xl font-bold text-white"
              >
                {bag.name}
              </motion.h1>

              {/* Updated Time */}
              <div className="flex items-center gap-2 text-emerald-200/60 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Updated {updatedTime}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                {isOwner ? (
                  <Button
                    variant="outline"
                    className="bg-emerald-500/10 border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/20"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Bag
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={onLike}
                      variant={isLiked ? "default" : "outline"}
                      className={cn(
                        "transition-all",
                        isLiked
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/20"
                      )}
                    >
                      <Heart
                        className={cn(
                          "w-4 h-4 mr-2",
                          isLiked && "fill-current"
                        )}
                      />
                      {isLiked ? "Liked" : "Like"}
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-emerald-500/10 border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/20"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-50 font-semibold">
                    {bag.likes_count || 0}
                  </span>
                  <span className="text-emerald-200/60">likes</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BagHero;