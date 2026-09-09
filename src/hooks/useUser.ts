import type { User } from "@supabase/supabase-js";
import { useAuth } from "../app/context/AuthContext";

/**
 * Atalho para o usuário autenticado atual. Fonte de verdade é o
 * AuthProvider (src/app/context/AuthContext.tsx) — mantido como hook
 * separado só para não obrigar quem já usa `useUser()` a mudar de API.
 */
export function useUser(): User | null {
  return useAuth().user;
}
