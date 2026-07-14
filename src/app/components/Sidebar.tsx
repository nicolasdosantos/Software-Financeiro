import { motion, AnimatePresence } from "motion/react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, CalendarDays, Tag, BarChart3,
  Target, PiggyBank, TrendingUp, User, FileText, ChevronLeft,
  Bell, Wallet, X
} from "lucide-react";
import { useUser } from "../../hooks/useUser";
import { useNavigate } from "react-router-dom";


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
  isMobile = false, mobileOpen = false, notificationCount = 0
}: SidebarProps) {
  const showLabels = isMobile || !collapsed;
  const sidebarWidth = isMobile ? 260 : collapsed ? 72 : 260;

  /* Mobile: slide in from left as overlay; Desktop: fixed position */
  const mobileTransform = isMobile
    ? mobileOpen ? "translateX(0)" : "translateX(-100%)"
    : "translateX(0)";
  const user = useUser();
  const navigate = useNavigate();
  const userInitial = (user?.user_metadata?.name || user?.email || "?").charAt(0).toUpperCase();

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
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #3b6de8, #193faf 55%, #0f0f11)", boxShadow: "0 4px 14px rgba(32,75,202,0.35)" }}
        >
          <Wallet size={18} className="text-white" />
        </motion.div>
        <AnimatePresence initial={false}>
          {showLabels && (
            <motion.div
              key="logo-label"
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <p className="text-white font-semibold leading-none whitespace-nowrap">Nexo</p>
              <p className="text-xs mt-0.5 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                Controle financeiro
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={onToggle}
            className="ml-auto p-1 rounded-lg transition-colors hover:bg-[var(--sidebar-accent)]"
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
                <div className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl group">
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "var(--primary)", boxShadow: "0 4px 14px rgba(32,75,202,0.35)" }}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: "var(--sidebar-accent)" }} />
                  )}
                  <span
                    className="relative z-10 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                    style={{ color: isActive ? "#fff" : "var(--muted-foreground)" }}
                  >
                    <Icon size={18} />
                  </span>

                  {showLabels && (
                    <span
                      className="relative z-10 text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-transform duration-200 group-hover:translate-x-0.5"
                      style={{ color: isActive ? "#fff" : "var(--muted-foreground)" }}
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
        {/* Notifications — links to notification preferences in Perfil */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/perfil")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--sidebar-accent)]"
          style={{ color: "var(--muted-foreground)" }}
        >
          <div className="relative shrink-0">
            <Bell size={18} />
            {notificationCount > 0 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 14 }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center"
                style={{ background: "var(--destructive)", fontSize: "10px" }}
              >
                {notificationCount}
              </motion.span>
            )}
          </div>
          {showLabels && (
            <span className="text-sm font-medium whitespace-nowrap">Notificações</span>
          )}
        </motion.button>

        {/* User avatar */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/perfil")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-[var(--sidebar-accent)]"
        >
          <div className="relative shrink-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, #3b6de8, #193faf 55%, #000000)" }}
            >
              {userInitial}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
              style={{ background: "#10d9a4", border: "2px solid var(--sidebar)" }} />
          </div>
          {showLabels && (
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-medium text-white leading-none whitespace-nowrap">
                {user?.user_metadata?.name || "Usuário"}
              </p>

              <p className="text-xs mt-0.5 whitespace-nowrap truncate" style={{ color: "var(--muted-foreground)" }}>
                {user?.email || ""}
              </p>
            </div>
          )}
        </motion.div>

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-colors text-sm hover:bg-[var(--sidebar-accent)]"
            style={{ color: "var(--muted-foreground)" }}
          >
            <motion.span
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="flex items-center justify-center"
            >
              <ChevronLeft size={16} />
            </motion.span>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="collapse-label"
                  initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.16 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  Recolher
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
      </div>
    </aside>
  );
}
