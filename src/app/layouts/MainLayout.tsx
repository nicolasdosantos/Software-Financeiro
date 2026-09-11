import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Menu } from "lucide-react";
import { Sidebar } from "../components/Sidebar";
import { NotificationsBell } from "../components/NotificationsBell";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../hooks/useNotifications";
import { useDismissedNotifications } from "../hooks/useDismissedNotifications";

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Fonte única das notificações: alimenta tanto o sino da navbar quanto o
  // badge do atalho "Notificações" na Sidebar, que antes sempre mostrava 0
  // (a prop `notificationCount` existia mas nunca era passada por ninguém).
  const { user } = useAuth();
  const allNotifications = useNotifications();
  const activeIds = allNotifications.map((n) => n.id);
  const { dismissed, dismiss } = useDismissedNotifications(user?.id, activeIds);
  const visibleNotifications = allNotifications.filter((n) => !dismissed.includes(n.id));

  useEffect(() => {
    function check() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (!mobile) {
        setMobileOpen(false);
      }
    }

    check();

    window.addEventListener("resize", check);

    return () => {
      window.removeEventListener("resize", check);
    };
  }, []);

  const desktopSidebarWidth = sidebarCollapsed ? 72 : 260;

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--background)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Backdrop Mobile */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40"
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(2px)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar
        collapsed={isMobile ? false : sidebarCollapsed}
        onToggle={() => {
          if (isMobile) {
            setMobileOpen(false);
          } else {
            setSidebarCollapsed((prev) => !prev);
          }
        }}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        notificationCount={visibleNotifications.length}
      />

      {/* Conteúdo */}
      <div
        className="min-h-screen transition-all duration-300"
        style={{
          paddingLeft: isMobile ? 0 : desktopSidebarWidth,
        }}
      >
        {/* Navbar */}
        <div
          className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
          style={{
            background: "var(--surface-translucent)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
            boxShadow: "0 8px 24px -16px rgba(var(--primary-rgb), 0.35)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
                className="p-2 rounded-xl shrink-0"
                style={{
                  background: "var(--secondary)",
                  color: "var(--foreground)",
                }}
              >
                <Menu size={18} />
              </button>
            )}

            {/* Escondido em telas muito estreitas (<640px): junto com o
                hambúrguer, sino, tema e o badge "Online", não cabem todos
                numa única linha sem quebrar — cada página já tem seu
                próprio título (h1), então esse texto é só um extra. */}
            <span
              className="hidden sm:block truncate"
              style={{
                color: "var(--foreground)",
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              Bem vindo a Nexo!
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <NotificationsBell notifications={visibleNotifications} onDismiss={dismiss} />

            <span
              className="hidden sm:block"
              style={{
                color: "var(--muted-foreground)",
                fontSize: "0.8rem",
              }}
            >
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>

            {/* Também escondido em telas muito estreitas — decorativo, não
                essencial no celular, e mais uma peça pra caber na navbar. */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{
                background: "var(--secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: "var(--success)",
                }}
              />

              <span
                style={{
                  color: "var(--foreground)",
                  fontSize: "0.75rem",
                }}
              >
                Online
              </span>
            </div>
          </div>
        </div>

        {/* Página atual — teto de largura em monitores largos/ultrawide:
            sem isso, grids, tabelas e principalmente os gráficos (altura
            fixa, largura 100%) esticavam sem limite e ficavam com uma
            proporção ruim (cards enormes, gráficos achatados). */}
        <div className="p-3 sm:p-4 lg:p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        ::selection {
          background: rgba(var(--primary-rgb), 0.35);
        }
      `}</style>
    </div>
  );
}