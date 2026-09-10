import { useState } from "react";
import { motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { applyTheme, DEFAULT_THEME } from "../../lib/theme";
import type { ThemeMode } from "../../lib/theme";

/**
 * Botão de alternância de tema claro/escuro na navbar (MainLayout).
 * Mesmo padrão otimista de Profile.tsx > selectAccentColor: aplica a classe
 * na hora (ThemeEffect só reagiria depois que o Supabase confirmasse via
 * onAuthStateChange, o que deixaria o clique com uma resposta perceptível),
 * e reverte se a persistência falhar.
 */
export function ThemeToggle() {
  const { user } = useAuth();
  const current: ThemeMode = user?.user_metadata?.theme === "light" ? "light" : DEFAULT_THEME;
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const next: ThemeMode = current === "light" ? "dark" : "light";
    applyTheme(next);
    setPending(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { theme: next } });
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao salvar tema:", err);
      toast.error("Não foi possível salvar sua preferência de tema.");
      applyTheme(current);
    } finally {
      setPending(false);
    }
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={toggle}
      aria-label={current === "light" ? "Mudar para tema escuro" : "Mudar para tema claro"}
      title={current === "light" ? "Tema escuro" : "Tema claro"}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
      style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
    >
      <motion.span
        key={current}
        initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex items-center justify-center"
      >
        {current === "light" ? <Moon size={15} /> : <Sun size={15} />}
      </motion.span>
    </motion.button>
  );
}
