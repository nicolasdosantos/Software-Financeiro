import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    // pega usuário atual
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user);
    });

    // escuta mudanças de login/logout
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return user;
}