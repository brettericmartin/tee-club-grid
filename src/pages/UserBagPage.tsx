import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { displayNameToSlug } from "@/utils/slugify";

/**
 * UserBagPage handles username-based routing (/@username or /u/:username)
 * It finds the user by their username and shows their primary bag
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

  // Then, find their primary bag
  const { data: primaryBag, isLoading: bagLoading, error: bagError } = useQuery({
    queryKey: ["user-primary-bag", profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error("No profile found");

      // First try to get the primary bag
      let { data: bag, error } = await supabase
        .from("user_bags")
        .select("id, name, is_primary")
        .eq("user_id", profile.id)
        .eq("is_primary", true)
        .single();

      // If no primary bag, get the first bag
      if (error || !bag) {
        const { data: anyBag, error: anyError } = await supabase
          .from("user_bags")
          .select("id, name")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (anyError) {
          console.error("Error fetching any bag:", anyError);
          throw new Error("User has no bags");
        }

        bag = anyBag;
      }

      return bag;
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

  if (bagError || !primaryBag) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Bag Found</h2>
          <p className="text-emerald-100/60 mb-6">
            {profile.display_name} hasn't created a bag yet.
          </p>
          <a href="/bags" className="text-emerald-400 hover:text-emerald-300">
            Browse other bags →
          </a>
        </div>
      </div>
    );
  }

  // Redirect to the bag page with the bag ID
  // This way BagProfilePage can handle the actual display
  return <Navigate to={`/bag/${primaryBag.id}`} replace />;
};

export default UserBagPage;