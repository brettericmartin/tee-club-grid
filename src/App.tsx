import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { FeedProvider } from "./contexts/FeedContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Navigation from "./components/Navigation";
import BottomNavigation from "./components/navigation/BottomNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Analytics } from "@vercel/analytics/react";

// Direct imports for development to avoid dynamic import issues
import IndexPage from "@/pages/Index";
import LandingPage from "@/pages/Landing";
import BagsBrowserPage from "@/pages/BagsBrowser";
import BagDisplayPage from "@/pages/BagDisplayStyled";
import MyBagPage from "@/pages/MyBagSupabase";
import EquipmentPage from "@/pages/Equipment";
import EquipmentDetailPage from "@/pages/EquipmentDetail";
import FeedPage from "@/pages/Feed";
import WishlistPage from "@/pages/Wishlist";
import BadgesPage from "@/pages/Badges";
import BadgePreviewPage from "@/pages/BadgePreview";
import ForumPage from "@/pages/Forum";
import BagProfilePage from "@/pages/BagProfilePage";
import UserBagPage from "@/pages/UserBagPage";
import ForumIndexPage from "@/pages/ForumIndex";
import ForumCategoryPage from "@/pages/ForumCategory";
import ForumThreadPage from "@/pages/ForumThread";
import NotFoundPage from "@/pages/NotFound";
import AIBagAnalyzerPage from "@/pages/AIBagAnalyzer";
import SeedEquipmentPage from "@/pages/admin/SeedEquipment";
import EquipmentMigrationPage from "@/pages/admin/EquipmentMigration";
import DebugPage from "@/pages/Debug";
import DebugFeedPage from "@/pages/DebugFeed";

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

// Use direct imports in development, lazy loading in production
const isDev = import.meta.env.DEV;

const Index = isDev ? IndexPage : lazyImport(() => import("@/pages/Index"), "Home");
const Landing = isDev ? LandingPage : lazyImport(() => import("@/pages/Landing"), "Landing");
const BagsBrowser = isDev ? BagsBrowserPage : lazyImport(() => import("@/pages/BagsBrowser"), "Bags Browser");
const BagDisplay = isDev ? BagDisplayPage : lazyImport(() => import("@/pages/BagDisplayStyled"), "Bag Display");
const MyBag = isDev ? MyBagPage : lazyImport(() => import("@/pages/MyBagSupabase"), "My Bag");
const Equipment = isDev ? EquipmentPage : lazyImport(() => import("@/pages/Equipment"), "Equipment");
const EquipmentDetail = isDev ? EquipmentDetailPage : lazyImport(() => import("@/pages/EquipmentDetail"), "Equipment Detail");
const Feed = isDev ? FeedPage : lazyImport(() => import("@/pages/Feed"), "Feed");
const Wishlist = isDev ? WishlistPage : lazyImport(() => import("@/pages/Wishlist"), "Wishlist");
const Badges = isDev ? BadgesPage : lazyImport(() => import("@/pages/Badges"), "Badges");
const BadgePreview = isDev ? BadgePreviewPage : lazyImport(() => import("@/pages/BadgePreview"), "Badge Preview");
const Forum = isDev ? ForumPage : lazyImport(() => import("@/pages/Forum"), "Forum");
const ForumIndex = isDev ? ForumIndexPage : lazyImport(() => import("@/pages/ForumIndex"), "Forum Index");
const ForumCategory = isDev ? ForumCategoryPage : lazyImport(() => import("@/pages/ForumCategory"), "Forum Category");
const ForumThread = isDev ? ForumThreadPage : lazyImport(() => import("@/pages/ForumThread"), "Forum Thread");
const NotFound = isDev ? NotFoundPage : lazyImport(() => import("@/pages/NotFound"), "Not Found");
const AIBagAnalyzer = isDev ? AIBagAnalyzerPage : lazyImport(() => import("@/pages/AIBagAnalyzer"), "AI Bag Analyzer");

// Admin routes (rarely accessed)
const SeedEquipment = isDev ? SeedEquipmentPage : lazyImport(() => import("@/pages/admin/SeedEquipment"), "Seed Equipment");
const EquipmentMigration = isDev ? EquipmentMigrationPage : lazyImport(() => import("@/pages/admin/EquipmentMigration"), "Equipment Migration");

// Debug routes (developer-only)
const Debug = isDev ? DebugPage : lazyImport(() => import("@/pages/Debug"), "Debug");
const DebugFeed = isDev ? DebugFeedPage : lazyImport(() => import("@/pages/DebugFeed"), "Debug Feed");

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

function App() {
  console.log("[DEBUG] App component initializing...");
  console.log("[DEBUG] Environment:", {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? "Set" : "Not set",
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? "Set" : "Not set",
  });

  if (isDev) {
    console.log("[DEBUG] Running in development mode - using direct imports to avoid dynamic import issues");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <FeedProvider>
              <ErrorBoundary>
                <Toaster />
                <Sonner />
                <Analytics />
                
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
                        <Route path="/u/:username" element={<UserBagPage />} />
                        <Route path="/my-bag" element={<MyBag />} />
                        <Route path="/equipment" element={<Equipment />} />
                        <Route path="/equipment/:id" element={<EquipmentDetail />} />
                        <Route path="/feed" element={<Feed />} />
                        <Route path="/wishlist" element={<Wishlist />} />
                        <Route path="/badges" element={<Badges />} />
                        <Route path="/badge/:badgeType" element={<BadgePreview />} />
                        <Route path="/forum/*" element={<ForumIndex />} />
                        <Route path="/ai-bag-analyzer" element={<AIBagAnalyzer />} />
                        
                        {/* Admin routes */}
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
              </ErrorBoundary>
            </FeedProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;