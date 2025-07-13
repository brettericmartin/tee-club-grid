import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary, AsyncErrorBoundary } from "./components/ErrorBoundary";
import Navigation from "./components/Navigation";
import BottomNavigation from "./components/navigation/BottomNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Analytics } from "@vercel/analytics/react";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const BagsBrowser = lazy(() => import("./pages/BagsBrowser"));
const BagDisplay = lazy(() => import("./pages/BagDisplayStyled"));
const MyBag = lazy(() => import("./pages/MyBag"));
const Equipment = lazy(() => import("./pages/Equipment"));
const EquipmentDetail = lazy(() => import("./pages/EquipmentDetail"));
const Feed = lazy(() => import("./pages/Feed"));
const Saved = lazy(() => import("./pages/Saved"));
const Following = lazy(() => import("./pages/Following"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Badges = lazy(() => import("./pages/Badges"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin routes (rarely accessed)
const SeedEquipment = lazy(() => import("./pages/admin/SeedEquipment"));
const EquipmentMigration = lazy(() => import("./pages/admin/EquipmentMigration"));

// Debug routes (developer-only)
const Debug = lazy(() => import("./pages/Debug"));
const DebugFeed = lazy(() => import("./pages/DebugFeed"));

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
                        <Route path="/saved" element={<Saved />} />
                        <Route path="/following" element={<Following />} />
                        <Route path="/wishlist" element={<Wishlist />} />
                        <Route path="/badges" element={<Badges />} />
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
        </AuthProvider>
      </QueryClientProvider>
    </AsyncErrorBoundary>
  </ErrorBoundary>
  );
};

export default App;
