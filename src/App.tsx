import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import EnhancedAdmin from "./pages/EnhancedAdmin";
import Profile from "./pages/Profile";
import CategoryPage from "./pages/CategoryPage";
import EnhancedCategoryPage from "./pages/EnhancedCategoryPage";
import ContentDetail from "./pages/ContentDetail";
import EnhancedContentDetail from "./pages/EnhancedContentDetail";
import WatchPage from "./pages/WatchPage";
import EnhancedWatchPage from "./pages/EnhancedWatchPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin-enhanced" element={<EnhancedAdmin />} />
          <Route path="/profile" element={<Profile />} />
          
          {/* Category Routes */}
          <Route path="/category/:type" element={<CategoryPage />} />
          <Route path="/category-enhanced/:type" element={<EnhancedCategoryPage />} />
          <Route path="/category/movies" element={<EnhancedCategoryPage />} />
          <Route path="/category/series" element={<EnhancedCategoryPage />} />
          <Route path="/category/anime" element={<EnhancedCategoryPage />} />
          
          {/* Content Detail Routes */}
          <Route path="/content/:id" element={<EnhancedContentDetail />} />
          <Route path="/content-detail/:id" element={<ContentDetail />} />
          
          {/* Watch Routes */}
          <Route path="/watch/:id" element={<EnhancedWatchPage type="movie" />} />
          <Route path="/watch/episode/:id" element={<EnhancedWatchPage type="episode" />} />
          <Route path="/watch-basic/:id" element={<WatchPage type="movie" />} />
          <Route path="/watch-basic/episode/:id" element={<WatchPage type="episode" />} />
          
          {/* Search and Browse */}
          <Route path="/search" element={<EnhancedCategoryPage />} />
          <Route path="/browse" element={<EnhancedCategoryPage />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
