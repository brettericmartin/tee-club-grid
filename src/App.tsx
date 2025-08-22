import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AdminProvider } from "./contexts/AdminContext"; // TODO: Consider migrating forum components to useAdminAuth hook
import { FeedProvider } from "./contexts/FeedContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Navigation from "./components/Navigation";
import BottomNavigation from "./components/navigation/BottomNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Analytics } from "@vercel/analytics/react";
import { initializeReferralCapture, redeemStoredCodes } from "./utils/referralCapture";
import { BetaGuard } from "./components/auth/BetaGuard";
import { AdminGuard } from "./components/auth/AdminGuard";

// Direct imports for development to avoid dynamic import issues
import Index from "@/pages/Index";
import Landing from "@/pages/Landing";
import BagsBrowser from "@/pages/BagsBrowser";
import BagDisplay from "@/pages/BagDisplayStyled";
import MyBag from "@/pages/MyBagSupabase";
import Equipment from "@/pages/Equipment";
import EquipmentDetail from "@/pages/EquipmentDetail";
import Feed from "@/pages/Feed";
import TestSupabase from "@/pages/TestSupabase";
import Wishlist from "@/pages/Wishlist";
import Badges from "@/pages/Badges";
import BadgePreview from "@/pages/BadgePreview";
import Forum from "@/pages/Forum";
import BagProfilePage from "@/pages/BagProfilePage";
import UserBagPage from "@/pages/UserBagPage";
import BagShareView from "@/pages/BagShareView";
import ForumIndex from "@/pages/ForumIndex";
import ForumCategory from "@/pages/ForumCategory";
import ForumThread from "@/pages/ForumThread";
import NotFound from "@/pages/NotFound";
import AIBagAnalyzer from "@/pages/AIBagAnalyzer";
import PatchNotes from "@/pages/PatchNotes";
import AuthCallback from "@/pages/AuthCallback";
import Waitlist from "@/pages/Waitlist";
import BetaInfo from "@/pages/BetaInfo";
import SeedEquipment from "@/pages/admin/SeedEquipment";
import EquipmentMigration from "@/pages/admin/EquipmentMigration";
import WaitlistAdmin from "@/pages/admin/WaitlistAdmin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import Debug from "@/pages/Debug";
import VideoHub from "@/pages/VideoHub";
import DebugFeed from "@/pages/DebugFeed";
import { lazy } from "react";

// Lazy load pages for code splitting with enhanced error handling and debugging
const lazyImport = (importFn: () => Promise<any>, componentName?: string) => {
  console.log(`[DEBUG] Attempting to lazy load: ${componentName || 'unknown module'}`);
  
  return lazy(() =>
    importFn()
      .then((module) => {
        console.log(`[DEBUG] Successfully loaded: ${componentName || 'module'}`);
        return module;
      })
      .catch((error) => {
        console.error(`[DEBUG] Failed to load ${componentName || 'module'}:`, error);
        console.error(`[DEBUG] Error details:`, {
          message: error.message,
          stack: error.stack,
          componentName,
          timestamp: new Date().toISOString()
        });
        
        // Return a simple fallback component without hooks
        return {
          default: () => (
            <div className="min-h-screen flex items-center justify-center p-4">
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-bold mb-2 text-white">Unable to Load Page</h2>
                <p className="text-white/70 mb-6">
                  {componentName ? `The ${componentName} page` : 'This page'} failed to load.
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={() => window.location.reload()}
                    className="w-full px-6 py-3 bg-primary text-black font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Reload Page
                  </button>
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="w-full px-6 py-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Go to Home
                  </button>
                </div>
                <p className="text-white/50 text-sm mt-6">
                  If this problem persists, try clearing your browser cache.
                </p>
                {/* Debug info in development */}
                {import.meta.env.DEV && (
                  <details className="mt-4 text-left">
                    <summary className="cursor-pointer text-white/50 text-xs">Debug Info</summary>
                    <pre className="mt-2 p-2 bg-black/50 rounded text-xs text-white/70 overflow-auto">
                      {JSON.stringify({ 
                        error: error.message, 
                        component: componentName,
                        time: new Date().toISOString()
                      }, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ),
        };
      })
  );
};

// Page imports are defined above as direct imports to avoid dynamic import issues

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component for lazy routes
const PageLoadingFallback = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  </div>
);

// Inner app component that has access to auth context
function AppRoutes() {
  const { user } = useAuth();
  
  // Handle referral code redemption after auth
  useEffect(() => {
    if (user?.id) {
      // Try to redeem stored codes when user authenticates
      redeemStoredCodes(user.id).then(result => {
        if (result.success) {
          console.log('[App] Redeemed referral codes:', result.message);
        }
      });
    }
  }, [user?.id]);

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Header navigation */}
      <Navigation />
      
      {/* Main content area */}
      <main className="flex-1 pt-16 pb-16 md:pb-0">
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/old-index" element={<Index />} />
            <Route path="/bags-browser" element={<BagsBrowser />} />
            <Route path="/bags" element={<BagsBrowser />} />
            <Route path="/bag/:bagId" element={<BagDisplay />} />
            <Route path="/bag/:bagId/share" element={<BagShareView />} />
            <Route path="/bag/:username/:bagname" element={<BagDisplay />} />
            <Route path="/bag/:username" element={<UserBagPage />} />
            <Route path="/my-bag" element={<BetaGuard requireAuth={true}><MyBag /></BetaGuard>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/equipment/:id" element={<EquipmentDetail />} />
            <Route path="/test-supabase" element={<TestSupabase />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/badges" element={<Badges />} />
            <Route path="/badge/:badgeType" element={<BadgePreview />} />
            <Route path="/forum/*" element={<ForumIndex />} />
            <Route path="/ai-bag-analyzer" element={<AIBagAnalyzer />} />
            <Route path="/patch-notes" element={<PatchNotes />} />
            <Route path="/waitlist" element={<Waitlist />} />
            <Route path="/beta-info" element={<BetaInfo />} />
            <Route path="/video-hub" element={<VideoHub />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/waitlist" element={<AdminGuard><WaitlistAdmin /></AdminGuard>} />
            <Route path="/admin/seed-equipment" element={<SeedEquipment />} />
            <Route path="/admin/equipment-migration" element={<EquipmentMigration />} />
            
            {/* Debug routes - only in development */}
            {import.meta.env.DEV && (
              <>
                <Route path="/debug" element={<Debug />} />
                <Route path="/debug/feed" element={<DebugFeed />} />
              </>
            )}
            
            {/* 404 catch-all - must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      
      {/* Bottom navigation - visible on mobile only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNavigation />
      </div>
    </div>
  );
}

function App() {
  console.log("[DEBUG] App component initializing...");
  console.log("[DEBUG] Environment:", {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? "Set" : "Not set",
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? "Set" : "Not set",
  });

  // Using direct imports to avoid dynamic import issues
  console.log("[DEBUG] Using direct imports to avoid dynamic import issues");
  
  // Initialize referral capture on app mount
  useEffect(() => {
    initializeReferralCapture();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <OnboardingProvider>
              <AdminProvider>
                <FeedProvider>
                  <ErrorBoundary>
                    <Toaster />
                    <Sonner />
                    <Analytics />
                    <AppRoutes />
                  </ErrorBoundary>
                </FeedProvider>
              </AdminProvider>
            </OnboardingProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;