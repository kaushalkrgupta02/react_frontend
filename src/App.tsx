import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import VenueAppShell from "@/components/layout/VenueAppShell";
import StaffAuthPage from "./pages/StaffAuth";
import StaffProfilePage from "./pages/StaffProfile";
import VenueModePage from "./pages/VenueMode";
import NotFound from "./pages/NotFound";

// Create stable QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner position="top-center" />
            <BrowserRouter>
              <Routes>
                {/* Auth */}
                <Route path="/auth" element={<StaffAuthPage />} />
                
                {/* Main App Routes with Bottom Navigation */}
                <Route
                  path="/"
                  element={
                    <VenueAppShell>
                      <VenueModePage />
                    </VenueAppShell>
                  }
                />
                <Route
                  path="/tables"
                  element={
                    <VenueAppShell>
                      <VenueModePage />
                    </VenueAppShell>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <VenueAppShell>
                      <VenueModePage />
                    </VenueAppShell>
                  }
                />
                <Route
                  path="/guests"
                  element={
                    <VenueAppShell>
                      <VenueModePage />
                    </VenueAppShell>
                  }
                />
                <Route
                  path="/passes"
                  element={
                    <VenueAppShell>
                      <VenueModePage />
                    </VenueAppShell>
                  }
                />
                <Route
                  path="/packages"
                  element={
                    <VenueAppShell>
                      <VenueModePage />
                    </VenueAppShell>
                  }
                />
                <Route
                  path="/promos"
                  element={
                    <VenueAppShell>
                      <VenueModePage />
                    </VenueAppShell>
                  }
                />
                <Route
                  path="/deposits"
                  element={
                    <VenueAppShell>
                      <VenueModePage />
                    </VenueAppShell>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <VenueAppShell>
                      <VenueModePage />
                    </VenueAppShell>
                  }
                />
                <Route
                  path="/queue"
                  element={
                    <VenueAppShell>
                      <VenueModePage />
                    </VenueAppShell>
                  }
                />
                <Route
                  path="/kitchen"
                  element={
                    <VenueAppShell>
                      <VenueModePage />
                    </VenueAppShell>
                  }
                />
                <Route
                  path="/bar"
                  element={
                    <VenueAppShell>
                      <VenueModePage />
                    </VenueAppShell>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <VenueAppShell>
                      <StaffProfilePage />
                    </VenueAppShell>
                  }
                />
                
                {/* Legacy routes - redirect to new structure */}
                <Route path="/venue-mode" element={<Navigate to="/" replace />} />
                <Route path="/home" element={<Navigate to="/" replace />} />
                
                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
