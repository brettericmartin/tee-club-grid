import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import BagsBrowser from "./pages/BagsBrowser";
import BagDisplay from "./pages/BagDisplay";
import MyBag from "./pages/MyBag";
import Equipment from "./pages/Equipment";
import Feed from "./pages/Feed";
import Saved from "./pages/Saved";
import Following from "./pages/Following";
import Wishlist from "./pages/Wishlist";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background font-sans antialiased">
          {/* Fixed background gradient */}
          <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-primary/10 -z-10" />
          
          <Navigation />
          
          {/* Main content with padding for fixed nav */}
          <main className="pt-16">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/bags" element={<BagsBrowser />} />
              <Route path="/bag/:username" element={<BagDisplay />} />
              <Route path="/my-bag" element={<MyBag />} />
              <Route path="/equipment" element={<Equipment />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/following" element={<Following />} />
              <Route path="/wishlist" element={<Wishlist />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
