import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { applyTheme } from "../../lib/theme";

/**
 * Componente sem UI própria — aplica o tema claro/escuro salvo do usuário
 * (Perfil > Aparência) assim que a sessão carrega, e de novo sempre que ele
 * mudar (troca de usuário, ou o próprio usuário alterando a preferência em
 * outra aba). Mesmo padrão de AccentColorEffect.tsx.
 */
export function ThemeEffect() {
  const { user } = useAuth();

  useEffect(() => {
    applyTheme(user?.user_metadata?.theme);
  }, [user?.user_metadata?.theme]);

  return null;
}
