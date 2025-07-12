import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary, AsyncErrorBoundary } from "./components/ErrorBoundary";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import BagsBrowser from "./pages/BagsBrowser";
import BagDisplay from "./pages/BagDisplayStyled";
import MyBag from "./pages/MyBagSupabase";
import Equipment from "./pages/Equipment";
import EquipmentDetail from "./pages/EquipmentDetail";
import Feed from "./pages/Feed";
import SeedEquipment from "./pages/admin/SeedEquipment";
import EquipmentMigration from "./pages/admin/EquipmentMigration";
import Saved from "./pages/Saved";
import Following from "./pages/Following";
import Wishlist from "./pages/Wishlist";
import NotFound from "./pages/NotFound";
import Debug from "./pages/Debug";
import DebugFeed from "./pages/DebugFeed";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  console.log('App component rendering...');
  
  return (
  <ErrorBoundary>
    <AsyncErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="min-h-screen bg-background font-sans antialiased">
                {/* Fixed background gradient */}
                <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-primary/10 -z-10" />
                
                <Navigation />
                
                {/* Main content with padding for fixed nav */}
                <main className="pt-16">
                  <ErrorBoundary>
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
                <Route path="/admin/seed-equipment" element={<SeedEquipment />} />
                <Route path="/admin/equipment-migration" element={<EquipmentMigration />} />
                <Route path="/debug" element={<Debug />} />
                <Route path="/debug-feed" element={<DebugFeed />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
                  </ErrorBoundary>
                </main>
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
