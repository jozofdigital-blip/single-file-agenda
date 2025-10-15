import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Archive from "./pages/Archive";
import AllTasks from "./pages/AllTasks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const useHashRouter = import.meta.env.VITE_USE_HASH_ROUTER === "true";
const Router = useHashRouter ? HashRouter : BrowserRouter;
const rawBase = import.meta.env.VITE_APP_BASE || import.meta.env.BASE_URL || "/";
const basename = rawBase === "/"
  ? ""
  : rawBase.endsWith("/")
    ? rawBase.slice(0, -1)
    : rawBase;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router basename={basename}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/all-tasks" element={<AllTasks />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
