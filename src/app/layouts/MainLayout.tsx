import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Menu } from "lucide-react";
import { Sidebar } from "../components/Sidebar";

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

        // props temporárias
        currentPage="dashboard"
        onNavigate={() => {}}
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
            background: "rgba(8,10,19,0.92)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded-xl"
                style={{
                  background: "var(--secondary)",
                  color: "var(--foreground)",
                }}
              >
                <Menu size={18} />
              </button>
            )}

            <span
              className="text-white"
              style={{
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              Bem vindo a Nexo!
            </span>
          </div>

          <div className="flex items-center gap-2">
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

            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{
                background: "var(--secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#10d9a4",
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

        {/* Página atual */}
        <div className="p-3 sm:p-4 lg:p-6">
          <Outlet />
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        ::selection {
          background: rgba(32,75,202,0.35);
        }
      `}</style>
    </div>
  );
}