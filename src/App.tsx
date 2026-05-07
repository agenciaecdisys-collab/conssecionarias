import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminLayout from "./layouts/AdminLayout";
import Metrics from "./pages/dashboard/Metrics";
import Stock from "./pages/dashboard/Stock";
import AgentConfig from "./pages/dashboard/AgentConfig";
import KnowledgeBase from "./pages/dashboard/KnowledgeBase";
import CalendarPage from "./pages/dashboard/CalendarPage";
import WhatsAppPage from "./pages/dashboard/WhatsAppPage";
import UsersPage from "./pages/dashboard/UsersPage";
import Integrations from "./pages/dashboard/Integrations";
import Settings from "./pages/dashboard/Settings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminOrganizationForm from "./pages/admin/AdminOrganizationForm";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="organizations" element={<AdminOrganizations />} />
              <Route path="organizations/new" element={<AdminOrganizationForm />} />
              <Route path="organizations/:id/edit" element={<AdminOrganizationForm />} />
              <Route path="plans" element={<AdminPlans />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ProtectedRoute allowedRoles={["manager"]}><Metrics /></ProtectedRoute>} />
              <Route path="stock" element={<Stock />} />
              <Route path="agent" element={<ProtectedRoute allowedRoles={["manager"]}><AgentConfig /></ProtectedRoute>} />
              <Route path="knowledge" element={<ProtectedRoute allowedRoles={["manager"]}><KnowledgeBase /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute allowedRoles={["manager"]}><UsersPage /></ProtectedRoute>} />
              <Route path="integrations" element={<ProtectedRoute allowedRoles={["manager"]}><Integrations /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute allowedRoles={["manager"]}><Settings /></ProtectedRoute>} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="whatsapp" element={<WhatsAppPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
