import { motion } from "motion/react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Emoji ou ícone pequeno exibido em destaque. */
  icon: ReactNode;
  title: string;
  subtitle?: string;
  /** Ação opcional (ex: botão "Nova transação") logo abaixo do texto. */
  action?: ReactNode;
  /**
   * Versão compacta para espaços pequenos já dentro de um card (ex: painel
   * lateral do Monthly) — ícone menor, sem padding extra, uma linha só.
   * A versão cheia (padrão) é para a área principal de uma tela vazia.
   */
  compact?: boolean;
}

/**
 * Estado vazio ilustrado e consistente, usado em toda tela/lista sem dados
 * (nenhuma transação, nenhum investimento, sem despesas no mês, etc.) no
 * lugar de uma linha de texto cinza solta.
 */
export function EmptyState({ icon, title, subtitle, action, compact = false }: EmptyStateProps) {
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
        className="flex flex-col items-center justify-center text-center py-6 gap-1"
      >
        <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{icon}</span>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>{title}</p>
        {subtitle && <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", opacity: 0.8 }}>{subtitle}</p>}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center text-center py-14 sm:py-20 px-4"
    >
      <motion.span
        initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.05 }}
        style={{ fontSize: "3rem", lineHeight: 1, marginBottom: "12px" }}
      >
        {icon}
      </motion.span>
      <p className="mb-1.5" style={{ color: "var(--foreground)", fontWeight: 600 }}>{title}</p>
      {subtitle && (
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", maxWidth: "320px" }}>{subtitle}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
