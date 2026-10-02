import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthCard } from "../components/auth/AuthCard";

/**
 * Rota coringa (`path="*"`). Sem ela, como o vercel.json reescreve qualquer
 * URL para o index, um endereço inexistente renderizava uma tela vazia.
 * Reaproveita o AuthCard para manter o visual das telas públicas.
 */
export function NotFound() {
  const { session } = useAuth();
  const destination = session ? "/dashboard" : "/";

  return (
    <AuthCard
      title="Página não encontrada"
      subtitle="O endereço que você tentou abrir não existe ou foi movido."
      footer={
        <Link to={destination} className="inline-block font-medium" style={{ color: "var(--primary)" }}>
          {session ? "Voltar ao dashboard" : "Ir para o login"}
        </Link>
      }
    >
      <p
        className="text-center"
        style={{ fontSize: "3rem", fontWeight: 700, color: "var(--muted-foreground)", lineHeight: 1 }}
      >
        404
      </p>
    </AuthCard>
  );
}
