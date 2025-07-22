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

// Lazy load pages for code splitting with retry logic
const lazyImport = (importFn: () => Promise<any>, componentName?: string) => {
  return lazy(async () => {
    const maxRetries = 3;
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Try to import the module
        const module = await importFn();
        return module;
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${i + 1} failed to load ${componentName || 'module'}:`, error);
        
        // Wait before retrying (exponential backoff)
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    console.error(`Failed to load ${componentName || 'module'} after ${maxRetries} attempts:`, lastError);
    
    // Return a simple fallback component
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-2 text-white">Unable to Load Page</h2>
            <p className="text-white/70 mb-6">
              {componentName ? `The ${componentName} page` : 'This page'} failed to load after multiple attempts.
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
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-red-400 overflow-auto p-2 bg-black/50 rounded">
                  {lastError?.toString() || 'Unknown error'}
                  {lastError?.stack && '\n\nStack trace:\n' + lastError.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      ),
    };
  });
};

const Index = lazyImport(() => import("./pages/Index"), "Home");
const BagsBrowser = lazyImport(() => import("./pages/BagsBrowser"), "Bags Browser");
const BagDisplay = lazyImport(() => import("./pages/BagDisplayStyled"), "Bag Display");
const MyBag = lazyImport(() => import("./pages/MyBag"), "My Bag");
const Equipment = lazyImport(() => import("./pages/Equipment"), "Equipment");
const EquipmentDetail = lazyImport(() => import("./pages/EquipmentDetail"), "Equipment Detail");
const Feed = lazyImport(() => import("./pages/Feed"), "Feed");
const Wishlist = lazyImport(() => import("./pages/Wishlist"), "Wishlist");
const Badges = lazyImport(() => import("./pages/Badges"), "Badges");
const BadgePreview = lazyImport(() => import("./pages/BadgePreview"), "Badge Preview");
const Forum = lazyImport(() => import("./pages/Forum"), "Forum");
const ForumIndex = lazyImport(() => import("./pages/ForumIndex"), "Forum Index");
const ForumCategory = lazyImport(() => import("./pages/ForumCategory"), "Forum Category");
const ForumThread = lazyImport(() => import("./pages/ForumThread"), "Forum Thread");
const NotFound = lazyImport(() => import("./pages/NotFound"), "Not Found");

// Admin routes (rarely accessed)
const SeedEquipment = lazyImport(() => import("./pages/admin/SeedEquipment"), "Seed Equipment");
const EquipmentMigration = lazyImport(() => import("./pages/admin/EquipmentMigration"), "Equipment Migration");

// Debug routes (developer-only)
const Debug = lazyImport(() => import("./pages/Debug"), "Debug");
const DebugFeed = lazyImport(() => import("./pages/DebugFeed"), "Debug Feed");

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

const App = () => {
  // App component rendering
  
  return (
  <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FeedProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Analytics />
              <BrowserRouter>
              <div className="min-h-screen bg-background font-sans antialiased overflow-x-hidden">
                {/* Fixed background gradient */}
                <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-primary/10 -z-10" />
                
                <Navigation />
                
                {/* Main content with padding for fixed nav */}
                <main className="pt-16 pb-16 md:pb-0 overflow-x-hidden">
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoadingFallback />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/bags" element={<BagsBrowser />} />
                        <Route path="/bag/:bagId" element={<BagDisplay />} />
                        <Route path="/my-bag" element={<MyBag />} />
                        <Route path="/equipment" element={<Equipment />} />
                        <Route path="/equipment/:id" element={<EquipmentDetail />} />
                        <Route path="/feed" element={<Feed />} />
                        <Route path="/wishlist" element={<Wishlist />} />
                        <Route path="/badges" element={<Badges />} />
                        <Route path="/badge-preview" element={<BadgePreview />} />
                        <Route path="/forum/*" element={<ForumIndex />} />
                        <Route path="/admin/seed-equipment" element={<SeedEquipment />} />
                        <Route path="/admin/equipment-migration" element={<EquipmentMigration />} />
                        <Route path="/debug" element={<Debug />} />
                        <Route path="/debug-feed" element={<DebugFeed />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </main>
                
                {/* Bottom navigation for mobile */}
                <BottomNavigation />
              </div>
            </BrowserRouter>
          </TooltipProvider>
          </FeedProvider>
        </AuthProvider>
      </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
