import { useParams, Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowLeft } from "lucide-react";
import { displayNameToSlug } from "@/utils/slugify";
import { BagCard } from "@/components/bags/BagCard";
import { Button } from "@/components/ui/button";

/**
 * UserBagPage handles username-based routing (/bag/:username)
 * It shows all bags for a user
 */
const UserBagPage = () => {
  const { username } = useParams();

  // Find the user by their username
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["user-profile-by-username", username],
    queryFn: async () => {
      if (!username) throw new Error("No username provided");

      // Get the profile by username
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .eq("username", username)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        throw new Error(`No user found with username @${username}`);
      }

      return profile;
    },
    enabled: !!username,
  });

  // Get all bags for this user
  const { data: userBags, isLoading: bagLoading, error: bagError } = useQuery({
    queryKey: ["user-bags", profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error("No profile found");

      const { data: bags, error } = await supabase
        .from("user_bags")
        .select(`
          *,
          profiles (*),
          bag_equipment (
            count
          )
        `)
        .eq("user_id", profile.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching bags:", error);
        throw new Error("Failed to load bags");
      }

      return bags || [];
    },
    enabled: !!profile?.id,
  });

  // Loading states
  if (profileLoading || bagLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-emerald-200">Loading @{username}'s bag...</p>
        </div>
      </div>
    );
  }

  // Error states
  if (profileError || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">User Not Found</h2>
          <p className="text-emerald-100/60 mb-6">
            No user found at @{username}
          </p>
          <a href="/bags" className="text-emerald-400 hover:text-emerald-300">
            Browse all bags →
          </a>
        </div>
      </div>
    );
  }

  if (bagError || !userBags || userBags.length === 0) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Bags Found</h2>
          <p className="text-white/60 mb-6">
            {profile.display_name || profile.username} hasn't created any bags yet.
          </p>
          <Link to="/bags" className="text-primary hover:text-primary/80">
            Browse other bags →
          </Link>
        </div>
      </div>
    );
  }

  // If there's only one bag, redirect directly to it
  if (userBags.length === 1) {
    const bagSlug = userBags[0].name?.toLowerCase().replace(/\s+/g, '-');
    return <Navigate to={`/bag/${username}/${bagSlug}`} replace />;
  }

  // Show all bags for this user
  return (
    <div className="min-h-screen bg-[#111111] py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <Link to="/bags">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to All Bags
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            {profile.display_name || profile.username}'s Bags
          </h1>
          <p className="text-white/60">
            {userBags.length} bag{userBags.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userBags.map((bag) => {
            const bagSlug = bag.name?.toLowerCase().replace(/\s+/g, '-');
            return (
              <Link 
                key={bag.id} 
                to={`/bag/${username}/${bagSlug}`}
                className="block hover:scale-105 transition-transform"
              >
                <BagCard bag={bag} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UserBagPage;