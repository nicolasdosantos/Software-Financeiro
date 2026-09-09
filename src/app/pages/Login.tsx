import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Lock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthField } from "../components/auth/AuthField";
import { PasswordVisibilityToggle } from "../components/auth/PasswordVisibilityToggle";

export function Login() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && session) {
      navigate("/home");
    }
  }, [session, authLoading, navigate]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("Erro ao fazer login:", error);
        toast.error(error.message || "Não foi possível entrar. Verifique seus dados.");
        return;
      }

      navigate("/home");
    } catch (err) {
      console.error("Erro inesperado ao fazer login:", err);
      toast.error("Não foi possível entrar. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Bem-vindo a Nexos!"
      subtitle="Faça login para continuar"
      footer={
        <>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
            Não possui conta?
          </p>
          <Link to="/cadastro" className="mt-2 inline-block font-medium" style={{ color: "var(--primary)" }}>
            Criar conta
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleLogin}>
        <AuthField
          label="E-mail"
          icon={Mail}
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={setEmail}
        />

        <AuthField
          label="Senha"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          rightSlot={
            <PasswordVisibilityToggle
              visible={showPassword}
              onToggle={() => setShowPassword((prev) => !prev)}
            />
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-white font-medium transition-all hover:opacity-90"
          style={{ background: "var(--primary)", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </AuthCard>
  );
}
