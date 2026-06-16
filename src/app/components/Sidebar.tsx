import { motion, AnimatePresence } from "motion/react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, CalendarDays, Tag, BarChart3,
  Target, PiggyBank, TrendingUp, User, FileText, ChevronLeft,
  ChevronRight, Bell, Wallet, X
} from "lucide-react";


const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { path: "/mensal", label: "Controle Mensal", icon: CalendarDays },
  { path: "/categorias", label: "Categorias", icon: Tag },
  { path: "/graficos", label: "Gráficos", icon: BarChart3 },
  { path: "/metas", label: "Metas", icon: Target },
  { path: "/planejamento", label: "Planejamento", icon: PiggyBank },
  { path: "/investimentos", label: "Investimentos", icon: TrendingUp },
  { path: "/relatorios", label: "Relatórios", icon: FileText },
  { path: "/perfil", label: "Perfil", icon: User },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  notificationCount?: number;
}

export function Sidebar({
  collapsed, onToggle,
  isMobile = false, mobileOpen = false, notificationCount = 3
}: SidebarProps) {
  const showLabels = isMobile || !collapsed;
  const sidebarWidth = isMobile ? 260 : collapsed ? 72 : 260;

  /* Mobile: slide in from left as overlay; Desktop: fixed position */
  const mobileTransform = isMobile
    ? mobileOpen ? "translateX(0)" : "translateX(-100%)"
    : "translateX(0)";

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        width: sidebarWidth,
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        background: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
        transform: mobileTransform,
        transition: isMobile
          ? "transform 0.28s cubic-bezier(0.4,0,0.2,1)"
          : "width 0.28s cubic-bezier(0.4,0,0.2,1)",
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 shrink-0"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--primary)" }}
        >
          <Wallet size={18} className="text-white" />
        </div>
        {showLabels && (
          <div className="overflow-hidden">
            <p className="text-white font-semibold leading-none whitespace-nowrap">Nexo</p>
            <p className="text-xs mt-0.5 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
              Controle financeiro
            </p>
          </div>
        )}
        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={onToggle}
            className="ml-auto p-1 rounded-lg"
            style={{ color: "var(--muted-foreground)" }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path}>
              {({ isActive }) => (
                <div
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group"
                  style={{
                    background: isActive ? "var(--primary)" : "transparent",
                    color: isActive ? "#fff" : "var(--muted-foreground)",
                  }}
                  onMouseEnter={e => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--sidebar-accent)";
                  }}
                  onMouseLeave={e => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                  }}
                >
                  <span className="shrink-0">
                    <Icon size={18} />
                  </span>

                  {showLabels && (
                    <span
                      className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ color: isActive ? "#fff" : undefined }}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div
        className="px-2 pb-4 pt-3 shrink-0 space-y-1"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        {/* Notifications */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-accent)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <div className="relative shrink-0">
            <Bell size={18} />
            {notificationCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center"
                style={{ background: "var(--destructive)", fontSize: "10px" }}
              >
                {notificationCount}
              </span>
            )}
          </div>
          {showLabels && (
            <span className="text-sm font-medium whitespace-nowrap">Notificações</span>
          )}
        </button>

        {/* User avatar */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-accent)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, var(--primary), #7b9cff)" }}
          >
            J
          </div>
          {showLabels && (
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-medium text-white leading-none whitespace-nowrap">Teste</p>
              <p className="text-xs mt-0.5 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                teste@email.com
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-colors text-sm"
            style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-accent)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Recolher</span></>}
          </button>
        )}
      </div>
    </aside>
  );
}
