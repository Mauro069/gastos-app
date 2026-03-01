import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";
import { AuthProvider, UserSettingsProvider } from "@/contexts";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min — no refetch si el dato es fresco
      gcTime: 1000 * 60 * 30, // 30 min en cache aunque no se use
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserSettingsProvider>
          <App />
        </UserSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
    <SpeedInsights />
    <Analytics />
  </StrictMode>,
);
