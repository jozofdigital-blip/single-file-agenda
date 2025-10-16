import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import Archive from "./pages/Archive";
import AllTasks from "./pages/AllTasks";
import NotFound from "./pages/NotFound";
import TelegramAuthCallback from "./pages/TelegramAuthCallback";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const GH_REDIRECT_STORAGE_KEY = "__SPA_GH_REDIRECT__";

const computeBasename = () => {
  const baseUrl = import.meta.env.BASE_URL ?? "/";

  if (typeof window !== "undefined") {
    // If the build already knows its base (e.g. via Vite "base"), respect it
    if (baseUrl && baseUrl !== "/" && baseUrl !== "./") {
      return baseUrl.replace(/\/$/, "");
    }

    const { hostname, pathname } = window.location;
    if (hostname.endsWith("github.io")) {
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length > 0) {
        return `/${segments[0]}`;
      }
    }
  }

  return baseUrl === "./" ? undefined : baseUrl?.replace(/\/$/, "") || undefined;
};

const BASENAME = computeBasename();

const GitHubPagesRedirectHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!location.search.includes("gh_redirect=1")) return;

    try {
      const payloadRaw = window.sessionStorage.getItem(GH_REDIRECT_STORAGE_KEY);
      if (!payloadRaw) {
        console.warn("[APP] GitHub redirect flag present but storage empty");
        navigate("/", { replace: true });
        return;
      }

      window.sessionStorage.removeItem(GH_REDIRECT_STORAGE_KEY);
      const payload = JSON.parse(payloadRaw) as {
        pathname?: string;
        search?: string;
        hash?: string;
      } | null;

      if (!payload?.pathname) {
        console.warn("[APP] GitHub redirect payload missing pathname");
        navigate("/", { replace: true });
        return;
      }

      const targetPath = payload.pathname;
      const targetSearch = payload.search ?? "";
      const targetHash = payload.hash ?? "";
      const target = `${targetPath}${targetSearch}${targetHash}`;
      console.log("[APP] Restoring GitHub Pages deep-link", target);
      navigate(target || "/", { replace: true });
    } catch (error) {
      console.error("[APP] Failed to restore GitHub redirect", error);
      navigate("/", { replace: true });
    }
  }, [location.search, navigate]);

  return null;
};

const queryClient = new QueryClient();

const App = () => {
  console.log('[APP] render');
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={BASENAME}>
          <GitHubPagesRedirectHandler />
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
