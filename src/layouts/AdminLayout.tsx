import { Outlet, useNavigate } from "react-router-dom";
import { BarChart3, Building2, CreditCard, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar, { type SidebarNavItem } from "@/components/AppSidebar";

const navItems: SidebarNavItem[] = [
  { icon: BarChart3, label: "Dashboard", path: "/admin", end: true },
  { icon: Building2, label: "Concessionarias", path: "/admin/organizations" },
  { icon: CreditCard, label: "Planos", path: "/admin/plans" },
  { icon: Settings, label: "Configuracoes", path: "/admin/settings" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-[#060608] relative">
      {/* Ambient glow */}
      <div className="fixed top-[-20%] right-[10%] w-[500px] h-[500px] rounded-full bg-primary/[0.02] blur-[200px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-accent/[0.015] blur-[180px] pointer-events-none" />

      <AppSidebar
        navItems={navItems}
        title="AutoGest"
        subtitle="Admin"
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto md:p-8 lg:p-10 p-5 pt-20 md:pt-8 lg:pt-10 relative z-10">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
