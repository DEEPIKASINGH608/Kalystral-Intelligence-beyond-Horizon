import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { CommandShell } from "./components/layout/CommandShell";
import { AuthPage } from "./pages/AuthPage";
import { OverviewPage } from "./pages/OverviewPage";
import { RateForecastPage } from "./pages/RateForecastPage";
import { RiskPage } from "./pages/RiskPage";
import { VesselPortFitPage } from "./pages/VesselPortFitPage";
import { DecisionVaultPage } from "./pages/DecisionVaultPage";


export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <CommandShell>
                  <OverviewPage />
                </CommandShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/forecast"
            element={
              <ProtectedRoute>
                <CommandShell>
                  <RateForecastPage />
                </CommandShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk"
            element={
              <ProtectedRoute>
                <CommandShell>
                  <RiskPage />
                </CommandShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/optimize"
            element={
              <ProtectedRoute>
                <CommandShell>
                  <VesselPortFitPage />
                </CommandShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/vault"
            element={
              <ProtectedRoute>
                <CommandShell>
                  <DecisionVaultPage />
                </CommandShell>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;