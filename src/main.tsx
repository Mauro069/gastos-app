import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import App from "./App";
import PromediosPage from "./pages/PromediosPage";
import IngresosPage from "./pages/IngresosPage";
import ActivosPage from "./pages/ActivosPage";
import RangePage from "./pages/RangePage";
import ProfilePage from "./pages/ProfilePage";
import { AuthProvider, UserSettingsProvider } from "@/contexts";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserSettingsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/promedios" element={<Navigate to="/promedios/resumen" replace />} />
              <Route path="/promedios/:tab" element={<PromediosPage />} />
              <Route path="/ingresos" element={<IngresosPage />} />
              <Route path="/activos" element={<ActivosPage />} />
              <Route path="/historial" element={<RangePage />} />
              <Route path="/perfil" element={<ProfilePage />} />
            </Routes>
          </BrowserRouter>
        </UserSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
    <SpeedInsights />
    <Analytics />
  </StrictMode>,
);
