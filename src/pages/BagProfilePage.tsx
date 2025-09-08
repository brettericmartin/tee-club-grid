import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Components
import BagHero from "@/components/bag/BagHero";
import SpecGrid from "@/components/bag/SpecGrid";
import ClubList from "@/components/bag/ClubList";
import GappingChart from "@/components/bag/GappingChart";
import ShareStrip from "@/components/bag/ShareStrip";
import CTAButtons from "@/components/bag/CTAButtons";

interface BagData {
  id: string;
  name: string;
  user_id: string;
  background_image?: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  views_count: number;
  profiles: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    handicap?: number;
    location?: string;
    title?: string;
  };
  bag_equipment: Array<{
    id: string;
    bag_id: string;
    equipment_id: string;
    is_featured: boolean;
    purchase_price?: number;
    purchase_date?: string;
    custom_specs?: any;
    custom_photo_url?: string;
    loft?: string;
    shaft_id?: string;
    grip_id?: string;
    shaft_brand?: string;
    shaft_model?: string;
    shaft_flex?: string;
    grip_brand?: string;
    grip_model?: string;
    equipment: {
      id: string;
      brand: string;
      model: string;
      category: string;
      image_url?: string;
      msrp?: number;
      specs?: any;
    };
  }>;
}

const BagProfilePage = () => {
  const { bagId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [isLiked, setIsLiked] = useState(false);

  // Fetch bag data by ID only
  const { data: bagData, isLoading, error } = useQuery({
    queryKey: ["bag-profile", bagId],
    queryFn: async () => {
      console.log("[BagProfilePage] Fetching bag with ID:", bagId);
      if (!bagId) throw new Error("No bag ID provided");

      const { data, error } = await supabase
        .from("user_bags")
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            handicap,
            location,
            title
          ),
          bag_equipment (
            *,
            equipment (*)
          )
        `)
        .eq("id", bagId)
        .single();
      
      console.log("[BagProfilePage] Query result:", { data, error });
      
      if (error) {
        console.error("[BagProfilePage] Supabase error:", error);
        throw error;
      }
      
      if (!data) {
        console.error("[BagProfilePage] No data returned for bag ID:", bagId);
        throw new Error("Bag data not found");
      }
      
      return data as BagData;
    },
    enabled: !!bagId,
  });

  // Check if current user has liked this bag
  useEffect(() => {
    if (bagData && currentUser) {
      checkIfLiked();
    }
  }, [bagData, currentUser]);

  const checkIfLiked = async () => {
    if (!bagData || !currentUser) return;

    const { data } = await supabase
      .from("bag_likes")
      .select("id")
      .eq("bag_id", bagData.id)
      .eq("user_id", currentUser.id)
      .single();

    setIsLiked(!!data);
  };

  // Increment view count
  useEffect(() => {
    if (bagData) {
      incrementViewCount();
    }
  }, [bagData?.id]);

  const incrementViewCount = async () => {
    if (!bagData) return;
    
    await supabase
      .from("user_bags")
      .update({ views_count: (bagData.views_count || 0) + 1 })
      .eq("id", bagData.id);
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast.error("Please sign in to like bags");
      return;
    }

    if (!bagData) return;

    try {
      if (isLiked) {
        await supabase
          .from("bag_likes")
          .delete()
          .eq("bag_id", bagData.id)
          .eq("user_id", currentUser.id);
        
        setIsLiked(false);
        toast.success("Removed from liked bags");
      } else {
        await supabase
          .from("bag_likes")
          .insert({
            bag_id: bagData.id,
            user_id: currentUser.id,
          });
        
        setIsLiked(true);
        toast.success("Added to liked bags!");
      }
    } catch (error) {
      toast.error("Failed to update like status");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
      </div>
    );
  }

  if (error || !bagData) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center elevation-1 p-8 rounded-lg">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-4">Bag not found</h2>
          <p className="text-[#FAFAFA]/60 mb-6">
            This bag doesn't exist or has been removed.
          </p>
          <Button
            onClick={() => navigate("/bags")}
            className="btn-primary"
          >
            Browse Bags
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = currentUser?.id === bagData.user_id;

  // Calculate bag stats
  const totalValue = bagData.bag_equipment?.reduce((sum, item) => {
    return sum + (item.purchase_price || item.equipment?.msrp || 0);
  }, 0) || 0;

  const clubCount = bagData.bag_equipment?.filter(item => 
    ["driver", "fairway_wood", "hybrid", "iron", "wedge", "putter"].includes(item.equipment?.category || "")
  ).length || 0;

  const accessoryCount = bagData.bag_equipment?.length - clubCount || 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Back Navigation with Glassmorphism */}
      <div className="sticky top-0 z-40 user-themed-nav">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-[#FAFAFA] hover:text-[#FAFAFA] hover:bg-[#1C1C1C]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-[#FAFAFA] font-medium">
            {bagData.profiles.display_name || bagData.profiles.username}'s Bag
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <BagHero
        bag={bagData}
        isOwner={isOwner}
        isLiked={isLiked}
        onLike={handleLike}
      />

      {/* Spec Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SpecGrid
          totalValue={totalValue}
          clubCount={clubCount}
          accessoryCount={accessoryCount}
          bagData={bagData}
        />
      </div>

      {/* Club List */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ClubList
          equipment={bagData.bag_equipment || []}
          isOwner={isOwner}
        />
      </div>

      {/* Gapping Chart */}
      {clubCount > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <GappingChart
            equipment={bagData.bag_equipment || []}
          />
        </div>
      )}

      {/* Share Strip */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ShareStrip
          bag={bagData}
          username={bagData.profiles.username}
        />
      </div>

      {/* CTA Buttons for non-owners */}
      {!isOwner && (
        <div className="max-w-7xl mx-auto px-4 py-8 pb-16">
          <CTAButtons
            ownerName={bagData.profiles.display_name || bagData.profiles.username}
            ownerId={bagData.profiles.id}
          />
        </div>
      )}
    </div>
  );
};

export default BagProfilePage;