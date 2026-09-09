import { describe, expect, it } from "vitest";
import { DEFAULT_DASHBOARD_LAYOUT, normalizeDashboardLayout } from "./dashboardWidgets";

describe("normalizeDashboardLayout", () => {
  it("retorna o layout padrão quando não há nada salvo", () => {
    expect(normalizeDashboardLayout(undefined)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(normalizeDashboardLayout(null)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(normalizeDashboardLayout({})).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("preserva uma ordem customizada válida", () => {
    const result = normalizeDashboardLayout({ order: ["recent", "stats", "charts", "goals", "budget"], hidden: [] });
    expect(result.order).toEqual(["recent", "stats", "charts", "goals", "budget"]);
  });

  it("adiciona ao fim widgets conhecidos que faltam na ordem salva", () => {
    // Simula um usuário que personalizou o dashboard antes dos widgets
    // "goals" e "budget" existirem — eles precisam aparecer no fim, não
    // sumir nem quebrar a ordem já escolhida.
    const result = normalizeDashboardLayout({ order: ["recent", "stats", "charts"], hidden: [] });
    expect(result.order).toEqual(["recent", "stats", "charts", "goals", "budget"]);
  });

  it("descarta da ordem ids que não existem mais como widget", () => {
    const result = normalizeDashboardLayout({ order: ["stats", "widget-antigo-removido", "charts", "recent"], hidden: [] });
    expect(result.order).toEqual(["stats", "charts", "recent", "goals", "budget"]);
  });

  it("preserva hidden válido e descarta ids desconhecidos", () => {
    const result = normalizeDashboardLayout({ order: DEFAULT_DASHBOARD_LAYOUT.order, hidden: ["recent", "algo-invalido"] });
    expect(result.hidden).toEqual(["recent"]);
  });

  it("nunca deixa a ordem com ids duplicados", () => {
    const result = normalizeDashboardLayout({ order: ["stats", "stats", "charts", "recent"], hidden: [] });
    expect(new Set(result.order).size).toBe(result.order.length);
  });

  it("usa a quantidade padrão de transações quando não há valor salvo ou ele é inválido", () => {
    expect(normalizeDashboardLayout({}).settings.recentCount).toBe(6);
    expect(normalizeDashboardLayout({ settings: { recentCount: 999 } }).settings.recentCount).toBe(6);
    expect(normalizeDashboardLayout({ settings: { recentCount: "10" } }).settings.recentCount).toBe(6);
  });

  it("preserva uma quantidade de transações válida", () => {
    expect(normalizeDashboardLayout({ settings: { recentCount: 3 } }).settings.recentCount).toBe(3);
    expect(normalizeDashboardLayout({ settings: { recentCount: 10 } }).settings.recentCount).toBe(10);
  });
});
