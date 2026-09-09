import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { applyAccentColor } from "../../lib/accentColors";

/**
 * Componente sem UI própria — só aplica a cor de destaque salva do usuário
 * (Perfil > Aparência) nas variáveis CSS assim que a sessão carrega, e de
 * novo sempre que ela mudar (troca de usuário, ou o próprio usuário
 * alterando a preferência em outra aba).
 */
export function AccentColorEffect() {
  const { user } = useAuth();

  useEffect(() => {
    applyAccentColor(user?.user_metadata?.accentColor);
  }, [user?.user_metadata?.accentColor]);

  return null;
}
