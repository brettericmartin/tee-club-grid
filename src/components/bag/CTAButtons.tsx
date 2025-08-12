import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, UserPlus, GitCompareArrows, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CTAButtonsProps {
  ownerName: string;
  ownerId: string;
}

const CTAButtons = ({ ownerName, ownerId }: CTAButtonsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const handleCreateBag = () => {
    if (!user) {
      toast.error("Please sign in to create your bag");
      navigate("/");
      return;
    }
    navigate("/my-bag");
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error("Please sign in to follow users");
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", ownerId);
        
        setIsFollowing(false);
        toast.success(`Unfollowed ${ownerName}`);
      } else {
        // Follow
        await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: ownerId,
        });
        
        setIsFollowing(true);
        toast.success(`Now following ${ownerName}!`);
      }
    } catch (error) {
      toast.error("Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCompareBags = () => {
    if (!user) {
      toast.error("Please sign in to compare bags");
      return;
    }
    toast.info("Bag comparison feature coming soon!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Main CTA Section */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-8">
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex p-4 rounded-full bg-emerald-500/20"
          >
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-white">
              Ready to Share Your Setup?
            </h3>
            <p className="text-emerald-200/70 max-w-md mx-auto">
              Join thousands of golfers showcasing their equipment and connecting with the community
            </p>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            <Button
              onClick={handleCreateBag}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg shadow-lg shadow-emerald-500/25"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your Bag
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative overflow-hidden rounded-xl p-6",
            "bg-gradient-to-br from-blue-500/10 to-blue-600/5",
            "border border-blue-500/20",
            "hover:border-blue-400/30 transition-all"
          )}
        >
          <div className="relative z-10 space-y-3">
            <UserPlus className="w-8 h-8 text-blue-400" />
            <h4 className="text-lg font-semibold text-white">
              Follow {ownerName}
            </h4>
            <p className="text-emerald-200/60 text-sm">
              Get updates when they modify their bag or share new content
            </p>
            <Button
              onClick={handleFollow}
              disabled={followLoading}
              variant="outline"
              className="w-full bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
            >
              {followLoading ? (
                "Loading..."
              ) : isFollowing ? (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Follow
                </>
              )}
            </Button>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative overflow-hidden rounded-xl p-6",
            "bg-gradient-to-br from-purple-500/10 to-purple-600/5",
            "border border-purple-500/20",
            "hover:border-purple-400/30 transition-all"
          )}
        >
          <div className="relative z-10 space-y-3">
            <GitCompareArrows className="w-8 h-8 text-purple-400" />
            <h4 className="text-lg font-semibold text-white">
              Compare Bags
            </h4>
            <p className="text-emerald-200/60 text-sm">
              See how your equipment stacks up against {ownerName}'s
            </p>
            <Button
              onClick={handleCompareBags}
              variant="outline"
              className="w-full bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            >
              <GitCompareArrows className="w-4 h-4 mr-2" />
              Compare
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Stats to Encourage Sign Up */}
      <div className="text-center py-6 border-t border-emerald-500/20">
        <div className="flex justify-center gap-8">
          <div>
            <p className="text-2xl font-bold text-emerald-400">1,000+</p>
            <p className="text-sm text-emerald-200/60">Equipment Items</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">500+</p>
            <p className="text-sm text-emerald-200/60">Active Users</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">Free</p>
            <p className="text-sm text-emerald-200/60">Forever</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CTAButtons;