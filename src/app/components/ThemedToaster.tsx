import { useAuth } from "../context/AuthContext";
import { Toaster } from "./ui/sonner";
import { DEFAULT_THEME } from "../../lib/theme";

/**
 * Wrapper fino sobre o <Toaster/> (sonner) — antes ficava com
 * `theme="dark"` fixo em App.tsx, então os toasts continuavam escuros
 * mesmo com o tema claro (Perfil > Aparência) ativo. Mesma fonte de
 * verdade do tema usada em ThemeEffect.tsx.
 */
export function ThemedToaster() {
  const { user } = useAuth();
  const theme = user?.user_metadata?.theme === "light" ? "light" : DEFAULT_THEME;

  return <Toaster theme={theme} richColors position="top-right" />;
}
