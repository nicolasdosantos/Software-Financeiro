import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Lock, User } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthField } from "../components/auth/AuthField";
import { PasswordVisibilityToggle } from "../components/auth/PasswordVisibilityToggle";

// 8 é o mínimo recomendado (NIST/OWASP) — force também no Supabase Auth
// (Dashboard > Authentication > Sign In / Providers > Password) o mesmo
// valor, já que essa checagem aqui é só client-side/UX; quem chama a API
// de auth diretamente ainda está sujeito só ao mínimo configurado lá.
const MIN_PASSWORD_LENGTH = 8;

export function Cadastro() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!name.trim()) {
      toast.error("Informe seu nome.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Senha muito fraca (mínimo ${MIN_PASSWORD_LENGTH} caracteres).`);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
        },
      });

      if (error) {
        console.error("Erro ao criar conta:", error);
        toast.error(error.message || "Não foi possível criar sua conta.");
        return;
      }

      toast.success(
        data.session
          ? "Conta criada com sucesso!"
          : "Conta criada! Verifique seu e-mail para confirmar o cadastro."
      );
      navigate("/");
    } catch (err) {
      console.error("Erro inesperado ao criar conta:", err);
      toast.error("Não foi possível criar sua conta. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Criar Conta"
      subtitle="Comece a controlar suas finanças"
      footer={
        <>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
            Já possui conta?
          </p>
          <Link to="/" className="mt-2 inline-block font-medium" style={{ color: "var(--primary)" }}>
            Fazer Login
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleRegister}>
        <AuthField
          label="Nome"
          icon={User}
          placeholder="Seu nome"
          value={name}
          onChange={setName}
        />

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

        <AuthField
          label="Confirmar Senha"
          icon={Lock}
          type={showConfirmPassword ? "text" : "password"}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={setConfirmPassword}
          rightSlot={
            <PasswordVisibilityToggle
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((prev) => !prev)}
            />
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-white font-medium transition-all hover:opacity-90"
          style={{ background: "var(--primary)", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Criando..." : "Criar Conta"}
        </button>
      </form>
    </AuthCard>
  );
}
