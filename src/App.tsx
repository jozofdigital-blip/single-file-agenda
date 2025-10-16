import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Archive from "./pages/Archive";
import AllTasks from "./pages/AllTasks";
import NotFound from "./pages/NotFound";
import TelegramAuthCallback from "./pages/TelegramAuthCallback";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const computeBasename = () => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const { hostname, pathname } = window.location;
  if (!hostname.endsWith("github.io")) {
    return undefined;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return undefined;
  }

  const repoSegment = segments[0];
  return repoSegment ? `/${repoSegment}` : undefined;
};

const BASENAME = computeBasename();

const queryClient = new QueryClient();

const App = () => {
  console.log('[APP] render');
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={BASENAME ?? "/"}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<TelegramAuthCallback />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/all-tasks" element={<AllTasks />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
