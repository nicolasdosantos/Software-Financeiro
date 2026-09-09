import { describe, expect, it } from "vitest";
import { DEFAULT_DASHBOARD_LAYOUT, normalizeDashboardLayout } from "./dashboardWidgets";

describe("normalizeDashboardLayout", () => {
  it("retorna o layout padrão quando não há nada salvo", () => {
    expect(normalizeDashboardLayout(undefined)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(normalizeDashboardLayout(null)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(normalizeDashboardLayout({})).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("preserva uma ordem customizada válida", () => {
    const result = normalizeDashboardLayout({ order: ["recent", "stats", "charts"], hidden: [] });
    expect(result.order).toEqual(["recent", "stats", "charts"]);
  });

  it("adiciona ao fim widgets conhecidos que faltam na ordem salva", () => {
    const result = normalizeDashboardLayout({ order: ["recent"], hidden: [] });
    expect(result.order).toEqual(["recent", "stats", "charts"]);
  });

  it("descarta da ordem ids que não existem mais como widget", () => {
    const result = normalizeDashboardLayout({ order: ["stats", "widget-antigo-removido", "charts", "recent"], hidden: [] });
    expect(result.order).toEqual(["stats", "charts", "recent"]);
  });

  it("preserva hidden válido e descarta ids desconhecidos", () => {
    const result = normalizeDashboardLayout({ order: ["stats", "charts", "recent"], hidden: ["recent", "algo-invalido"] });
    expect(result.hidden).toEqual(["recent"]);
  });

  it("nunca deixa a ordem com ids duplicados", () => {
    const result = normalizeDashboardLayout({ order: ["stats", "stats", "charts", "recent"], hidden: [] });
    expect(new Set(result.order).size).toBe(result.order.length);
  });
});
