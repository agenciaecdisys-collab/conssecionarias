import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, LogOut, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SidebarNavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  end?: boolean;
}

interface AppSidebarProps {
  navItems: SidebarNavItem[];
  title: string;
  subtitle?: string;
  onLogout: () => void;
}

const AppSidebar = ({ navItems, title, subtitle, onLogout }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center border-b border-white/[0.04] overflow-hidden ${collapsed ? "p-3 justify-center" : "p-5 gap-3"}`}>
        <motion.img
          src="/logo.png"
          alt="AutoGest"
          className={`w-auto shrink-0 ${collapsed ? "h-5" : "h-8"}`}
          animate={
            collapsed
              ? { x: [0, 3, 0], opacity: [0.7, 1, 0.7] }
              : { x: 0, opacity: 1 }
          }
          transition={
            collapsed
              ? { duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }
              : { duration: 0.3 }
          }
        />
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
            <span className="text-[13px] font-medium tracking-[0.04em] text-white/70">{title}</span>
            {subtitle && (
              <p className="text-[10px] text-white/40 tracking-[0.08em] uppercase mt-0.5">{subtitle}</p>
            )}
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 mt-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group relative ${
                isActive
                  ? "text-white/90 bg-white/[0.06]"
                  : "text-white/100 hover:text-white/60 hover:bg-white/[0.03]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full gradient-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && (
                  <span className="text-[13px] font-normal tracking-wide truncate">{item.label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/[0.04]">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/35 hover:text-red-400/70 w-full transition-all duration-300 hover:bg-white/[0.02] cursor-pointer"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span className="text-[13px] tracking-wide">Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-screen sticky top-0 bg-[#08080a] border-r border-white/[0.04] transition-all duration-500 ease-out ${
          collapsed ? "w-[64px]" : "w-60"
        }`}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-5 -right-3 w-6 h-6 rounded-full bg-[#08080a] border border-white/[0.08] flex items-center justify-center text-white/100 hover:text-white/60 z-10 hidden md:flex transition-colors duration-300 cursor-pointer"
          style={{ left: collapsed ? "52px" : "228px" }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#08080a]/90 backdrop-blur-xl border-b border-white/[0.04] flex items-center px-5 z-50">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white/50 cursor-pointer">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <span className="ml-4 text-[13px] font-medium tracking-[0.04em] text-white/60 truncate">
          {title}
          {subtitle ? <span className="text-white/40 ml-2">{subtitle}</span> : ""}
        </span>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="md:hidden fixed left-0 top-14 bottom-0 w-60 bg-[#08080a] border-r border-white/[0.04] z-40"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AppSidebar;
