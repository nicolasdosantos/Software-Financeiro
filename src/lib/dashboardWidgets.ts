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
  { id: "insights", label: "Insights Financeiros" },
  { id: "charts", label: "Gráficos (Evolução + Categorias)" },
  { id: "goals", label: "Progresso de Metas" },
  { id: "budget", label: "Orçamento do Mês" },
  { id: "recent", label: "Últimas transações" },
];

const KNOWN_IDS = DASHBOARD_WIDGETS.map((w) => w.id);

/** Opções de quantidade de transações exibidas no widget "Últimas transações". */
export const RECENT_COUNT_OPTIONS = [3, 6, 10] as const;
export const DEFAULT_RECENT_COUNT = 6;

export interface DashboardLayoutSettings {
  recentCount: number;
}

export interface DashboardLayout {
  order: string[];
  hidden: string[];
  settings: DashboardLayoutSettings;
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  order: [...KNOWN_IDS],
  hidden: [],
  settings: { recentCount: DEFAULT_RECENT_COUNT },
};

/**
 * Valida o layout salvo no user_metadata: garante que todo widget conhecido
 * apareça em `order` exatamente uma vez (widgets novos entram no fim; ids
 * antigos que não existem mais são descartados), que `hidden` só contenha
 * ids válidos, e que `settings.recentCount` seja uma das opções permitidas.
 * Protege contra dado corrompido/desatualizado vindo do banco — importante
 * aqui especialmente porque adicionamos widgets novos (goals, budget) depois
 * que a feature já tinha ido pro ar, então usuários existentes têm layout
 * salvo sem eles.
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

  const rawRecentCount = value.settings?.recentCount;
  const recentCount = RECENT_COUNT_OPTIONS.includes(rawRecentCount as typeof RECENT_COUNT_OPTIONS[number])
    ? (rawRecentCount as number)
    : DEFAULT_RECENT_COUNT;

  return { order, hidden, settings: { recentCount } };
}
