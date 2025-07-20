import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { FeedProvider } from "./contexts/FeedContext";
import { ErrorBoundary, AsyncErrorBoundary } from "./components/ErrorBoundary";
import Navigation from "./components/Navigation";
import BottomNavigation from "./components/navigation/BottomNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Analytics } from "@vercel/analytics/react";

// Lazy load pages for code splitting with error handling
const lazyImport = (importFn: () => Promise<any>) => {
  return lazy(() =>
    importFn().catch((error) => {
      console.error('Failed to load module:', error);
      // Return a fallback component
      return {
        default: () => (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Failed to load page</h2>
              <p className="text-muted-foreground mb-4">Please refresh the page to try again</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Refresh Page
              </button>
            </div>
          </div>
        ),
      };
    })
  );
};

const Index = lazyImport(() => import("./pages/Index"));
const BagsBrowser = lazyImport(() => import("./pages/BagsBrowser"));
const BagDisplay = lazyImport(() => import("./pages/BagDisplayStyled"));
const MyBag = lazyImport(() => import("./pages/MyBag"));
const Equipment = lazyImport(() => import("./pages/Equipment"));
const EquipmentDetail = lazyImport(() => import("./pages/EquipmentDetail"));
const Feed = lazyImport(() => import("./pages/Feed"));
const Wishlist = lazyImport(() => import("./pages/Wishlist"));
const Badges = lazyImport(() => import("./pages/Badges"));
const BadgePreview = lazyImport(() => import("./pages/BadgePreview"));
const NotFound = lazyImport(() => import("./pages/NotFound"));

// Admin routes (rarely accessed)
const SeedEquipment = lazyImport(() => import("./pages/admin/SeedEquipment"));
const EquipmentMigration = lazyImport(() => import("./pages/admin/EquipmentMigration"));

// Debug routes (developer-only)
const Debug = lazyImport(() => import("./pages/Debug"));
const DebugFeed = lazyImport(() => import("./pages/DebugFeed"));

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
    <AsyncErrorBoundary>
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
    </AsyncErrorBoundary>
  </ErrorBoundary>
  );
};

export default App;
