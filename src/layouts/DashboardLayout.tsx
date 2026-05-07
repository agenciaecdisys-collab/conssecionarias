import { Outlet, useNavigate } from "react-router-dom";
import { BarChart3, Car, Bot, BookOpen, Calendar, MessageCircle, Settings, Users, Plug } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDealership } from "@/hooks/useDealership";
import AppSidebar, { type SidebarNavItem } from "@/components/AppSidebar";

const allNavItems: SidebarNavItem[] = [
  { icon: BarChart3, label: "Métricas", path: "/dashboard", end: true, roles: ["manager"] },
  { icon: Car, label: "Estoque", path: "/dashboard/stock", roles: ["manager", "vendor"] },
  { icon: Bot, label: "Agent IA", path: "/dashboard/agent", roles: ["manager"] },
  { icon: BookOpen, label: "Base de Conhecimento", path: "/dashboard/knowledge", roles: ["manager"] },
  { icon: Calendar, label: "Agenda", path: "/dashboard/calendar", roles: ["manager", "vendor"] },
  { icon: MessageCircle, label: "WhatsApp", path: "/dashboard/whatsapp", roles: ["manager", "vendor"] },
  { icon: Users, label: "Usuários", path: "/dashboard/users", roles: ["manager"] },
  { icon: Plug, label: "Integrações", path: "/dashboard/integrations", roles: ["manager"] },
  { icon: Settings, label: "Configuração", path: "/dashboard/settings", roles: ["manager"] },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { signOut, role } = useAuth();
  const { dealership } = useDealership();

  const navItems = allNavItems.filter((item) =>
    (item as SidebarNavItem & { roles: string[] }).roles.includes(role ?? "vendor")
  );

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
        title={dealership?.name || "AutoGest"}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto md:p-8 lg:p-10 p-5 pt-20 md:pt-8 lg:pt-10 relative z-10">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
