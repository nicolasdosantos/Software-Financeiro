/**
 * Widgets do Dashboard que o usuário pode reordenar e ocultar em
 * Personalizar Dashboard. Cada widget é uma seção inteira da tela — não dá
 * pra reordenar dentro de uma seção (ex: Evolução Financeira e Gastos por
 * Categoria ficam sempre juntos, lado a lado, dentro do widget "charts").
 */
export interface DashboardWidget {
  id: string;
  label: string;
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: "stats", label: "Cards de resumo" },
  { id: "charts", label: "Gráficos (Evolução + Categorias)" },
  { id: "recent", label: "Últimas transações" },
];

export interface DashboardLayout {
  order: string[];
  hidden: string[];
}

const KNOWN_IDS = DASHBOARD_WIDGETS.map((w) => w.id);

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  order: KNOWN_IDS,
  hidden: [],
};

/**
 * Valida o layout salvo no user_metadata: garante que todo widget conhecido
 * apareça em `order` exatamente uma vez (widgets novos entram no fim; ids
 * antigos que não existem mais são descartados), e que `hidden` só contenha
 * ids válidos. Protege contra dado corrompido/desatualizado vindo do banco.
 */
export function normalizeDashboardLayout(raw: unknown): DashboardLayout {
  const value = (raw ?? {}) as Partial<DashboardLayout>;
  const rawOrder = Array.isArray(value.order) ? value.order.filter((id): id is string => typeof id === "string") : [];

  const seen = new Set<string>();
  const order: string[] = [];
  for (const id of [...rawOrder, ...KNOWN_IDS]) {
    if (KNOWN_IDS.includes(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }

  const rawHidden = Array.isArray(value.hidden) ? value.hidden.filter((id): id is string => typeof id === "string") : [];
  const hidden = [...new Set(rawHidden.filter((id) => KNOWN_IDS.includes(id)))];

  return { order, hidden };
}
