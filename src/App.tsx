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
const rawBase = import.meta.env.VITE_APP_BASE || import.meta.env.BASE_URL || "/";
const basename = rawBase === "/"
  ? ""
  : rawBase.endsWith("/")
    ? rawBase.slice(0, -1)
    : rawBase;

// We avoid passing the basename to HashRouter because the hash portion of the
// URL does not include the repository subdirectory on first load. Requiring it
// causes the router to discard the initial location and results in a blank
// screen on GitHub Pages. BrowserRouter still receives the normalized basename
// so direct navigation keeps working locally and when served from a sub-path.
const RoutesContent = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/archive" element={<Archive />} />
    <Route path="/all-tasks" element={<AllTasks />} />
    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {useHashRouter ? (
        <HashRouter>
          <RoutesContent />
        </HashRouter>
      ) : (
        <BrowserRouter basename={basename}>
          <RoutesContent />
        </BrowserRouter>
      )}
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
