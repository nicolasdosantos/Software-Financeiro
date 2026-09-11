import { describe, expect, it } from "vitest";
import {
  addMonths,
  formatCurrency,
  getAccumulatedBalance,
  getCategorySpend,
  getDistinctMonths,
  getFinancialInsights,
  getMonthName,
  getMonthTotals,
  getShortMonthName,
  getTodayDateInput,
  sumExpensesByCategory,
  toLocalDate,
  toLocalMonthDate,
} from "./FinanceContext";
import type { Category, Transaction } from "./FinanceContext";

function tx(overrides: Partial<Transaction> & Pick<Transaction, "type" | "amount" | "date" | "category">): Transaction {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    description: overrides.description ?? "Transação de teste",
    ...overrides,
  };
}

function cat(overrides: Partial<Category> & Pick<Category, "id" | "name">): Category {
  return {
    icon: "💳",
    color: "#204bca",
    type: "custom",
    ...overrides,
  };
}

describe("getMonthTotals", () => {
  it("soma receitas e despesas de um mês, ignorando outros meses", () => {
    const transactions: Transaction[] = [
      tx({ type: "income", amount: 1000, date: "2026-01-05", category: "cat-1" }),
      tx({ type: "expense", amount: 300, date: "2026-01-10", category: "cat-2" }),
      tx({ type: "expense", amount: 999, date: "2026-02-01", category: "cat-2" }), // outro mês
    ];

    const result = getMonthTotals(transactions, "2026-01");

    expect(result).toEqual({ income: 1000, expense: 300, balance: 700 });
  });

  it("retorna zeros para um mês sem nenhuma transação", () => {
    expect(getMonthTotals([], "2026-01")).toEqual({ income: 0, expense: 0, balance: 0 });
  });

  it("calcula saldo negativo quando despesas superam receitas", () => {
    const transactions: Transaction[] = [
      tx({ type: "income", amount: 100, date: "2026-03-01", category: "cat-1" }),
      tx({ type: "expense", amount: 250, date: "2026-03-02", category: "cat-2" }),
    ];

    expect(getMonthTotals(transactions, "2026-03").balance).toBe(-150);
  });
});

describe("getDistinctMonths", () => {
  it("retorna os meses únicos em ordem crescente", () => {
    const transactions: Transaction[] = [
      tx({ type: "expense", amount: 10, date: "2026-03-15", category: "cat-1" }),
      tx({ type: "expense", amount: 10, date: "2026-01-02", category: "cat-1" }),
      tx({ type: "income", amount: 10, date: "2026-02-20", category: "cat-1" }),
      tx({ type: "income", amount: 10, date: "2026-01-28", category: "cat-1" }), // mesmo mês do 2º item
    ];

    expect(getDistinctMonths(transactions)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("inclui os meses extras mesmo sem nenhuma transação neles", () => {
    const transactions: Transaction[] = [
      tx({ type: "expense", amount: 10, date: "2026-01-02", category: "cat-1" }),
    ];

    expect(getDistinctMonths(transactions, ["2026-05"])).toEqual(["2026-01", "2026-05"]);
  });

  it("não duplica um mês extra que já existe nas transações", () => {
    const transactions: Transaction[] = [
      tx({ type: "expense", amount: 10, date: "2026-01-02", category: "cat-1" }),
    ];

    expect(getDistinctMonths(transactions, ["2026-01"])).toEqual(["2026-01"]);
  });

  it("retorna array vazio sem transações e sem meses extras", () => {
    expect(getDistinctMonths([])).toEqual([]);
  });
});

describe("sumExpensesByCategory / getCategorySpend", () => {
  const transactions: Transaction[] = [
    tx({ type: "expense", amount: 100, date: "2026-01-05", category: "cat-1" }),
    tx({ type: "expense", amount: 50, date: "2026-01-10", category: "cat-1" }),
    tx({ type: "expense", amount: 30, date: "2026-01-12", category: "cat-2" }),
    tx({ type: "income", amount: 999, date: "2026-01-15", category: "cat-1" }), // receita não conta
    tx({ type: "expense", amount: 500, date: "2026-02-01", category: "cat-1" }), // outro mês
  ];

  it("agrupa despesas por categoria dentro de um mês", () => {
    expect(sumExpensesByCategory(transactions, "2026-01")).toEqual({
      "cat-1": 150,
      "cat-2": 30,
    });
  });

  it("soma o histórico inteiro quando nenhum mês é informado", () => {
    expect(sumExpensesByCategory(transactions)).toEqual({
      "cat-1": 650,
      "cat-2": 30,
    });
  });

  it("getCategorySpend retorna 0 para categoria sem despesas no período", () => {
    expect(getCategorySpend(transactions, "cat-2", "2026-02")).toBe(0);
  });

  it("getCategorySpend retorna o total correto de uma categoria específica", () => {
    expect(getCategorySpend(transactions, "cat-1", "2026-01")).toBe(150);
  });
});

describe("getAccumulatedBalance", () => {
  it("acumula o saldo de todos os meses até o mês informado, inclusive", () => {
    const transactions: Transaction[] = [
      tx({ type: "income", amount: 1000, date: "2026-01-05", category: "cat-1" }),
      tx({ type: "expense", amount: 200, date: "2026-01-10", category: "cat-2" }),
      tx({ type: "income", amount: 500, date: "2026-02-01", category: "cat-1" }),
      tx({ type: "expense", amount: 100, date: "2026-03-01", category: "cat-2" }), // não deve entrar
    ];

    expect(getAccumulatedBalance(transactions, "2026-02")).toBe(1000 - 200 + 500);
  });

  it("é equivalente a somar getMonthTotals de cada mês até o ponto (consistência entre as duas funções)", () => {
    const transactions: Transaction[] = [
      tx({ type: "income", amount: 300, date: "2026-01-01", category: "cat-1" }),
      tx({ type: "expense", amount: 50, date: "2026-01-15", category: "cat-2" }),
      tx({ type: "income", amount: 400, date: "2026-02-01", category: "cat-1" }),
      tx({ type: "expense", amount: 900, date: "2026-02-20", category: "cat-2" }),
    ];
    const months = getDistinctMonths(transactions);

    const expected = months.reduce((sum, m) => sum + getMonthTotals(transactions, m).balance, 0);

    expect(getAccumulatedBalance(transactions, months[months.length - 1])).toBe(expected);
  });

  it("retorna 0 quando não há nenhuma transação até o mês informado", () => {
    expect(getAccumulatedBalance([], "2026-01")).toBe(0);
  });
});

describe("formatCurrency", () => {
  it("formata valores positivos em BRL", () => {
    expect(formatCurrency(1234.5)).toBe("R$ 1.234,50");
  });

  it("formata zero corretamente", () => {
    expect(formatCurrency(0)).toBe("R$ 0,00");
  });

  it("formata valores negativos com o sinal", () => {
    expect(formatCurrency(-50)).toBe("-R$ 50,00");
  });
});

describe("addMonths", () => {
  it("soma meses dentro do mesmo ano", () => {
    expect(addMonths("2026-03-10", 2)).toBe("2026-05-10");
  });

  it("vira o ano quando a soma passa de dezembro", () => {
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });

  it("encurta pro último dia do mês de destino quando ele é mais curto (31/01 + 1 mês)", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28"); // 2026 não é bissexto
  });

  it("respeita fevereiro bissexto", () => {
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29"); // 2028 é bissexto
  });

  it("soma vários meses seguidos (uso em série parcelada) sem acumular erro de dia", () => {
    expect(addMonths("2026-01-31", 0)).toBe("2026-01-31");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-01-31", 2)).toBe("2026-03-31");
  });
});

describe("datas", () => {
  it("getTodayDateInput retorna uma string no formato YYYY-MM-DD", () => {
    expect(getTodayDateInput()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("toLocalDate interpreta a data como horário local, sem deslocar de dia por fuso horário", () => {
    const date = toLocalDate("2026-01-15");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(15);
  });

  it("toLocalMonthDate interpreta 'YYYY-MM' como o primeiro dia do mês", () => {
    const date = toLocalMonthDate("2026-03");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(1);
  });

  it("getMonthName e getShortMonthName não lançam erro e retornam texto não vazio", () => {
    expect(getMonthName("2026-01").length).toBeGreaterThan(0);
    expect(getShortMonthName("2026-01").length).toBeGreaterThan(0);
  });
});

describe("getFinancialInsights", () => {
  const categories: Category[] = [cat({ id: "alimentacao", name: "Alimentação" })];
  // Dia 15 de um mês de 30 dias — depois do mínimo pra projeção (5) e não é
  // o último dia, então a regra de projeção fica ativa nos testes que não
  // mexem nisso de propósito.
  const midMonth = new Date(2026, 3, 15); // 15/04/2026

  it("aponta a categoria fora do padrão quando o gasto atual passa muito da média dos 3 meses anteriores", () => {
    const transactions: Transaction[] = [
      tx({ type: "expense", amount: 500, date: "2026-04-01", category: "alimentacao" }), // atual
      tx({ type: "expense", amount: 100, date: "2026-03-01", category: "alimentacao" }),
      tx({ type: "expense", amount: 100, date: "2026-02-01", category: "alimentacao" }),
      tx({ type: "expense", amount: 100, date: "2026-01-01", category: "alimentacao" }),
    ];

    const insights = getFinancialInsights(transactions, categories, "2026-04", midMonth);

    const outlier = insights.find((i) => i.id === "category-outlier");
    expect(outlier).toBeDefined();
    expect(outlier?.kind).toBe("warning");
    expect(outlier?.description).toContain("Alimentação");
  });

  it("não aponta outlier quando a média histórica é baixa demais pra ser uma referência confiável", () => {
    const transactions: Transaction[] = [
      tx({ type: "expense", amount: 50, date: "2026-04-01", category: "alimentacao" }),
      tx({ type: "expense", amount: 5, date: "2026-03-01", category: "alimentacao" }),
      // sem gasto em fevereiro/janeiro — média cai bem abaixo do mínimo
    ];

    const insights = getFinancialInsights(transactions, categories, "2026-04", midMonth);

    expect(insights.find((i) => i.id === "category-outlier")).toBeUndefined();
  });

  it("não aponta outlier quando o aumento fica abaixo do limiar", () => {
    const transactions: Transaction[] = [
      tx({ type: "expense", amount: 110, date: "2026-04-01", category: "alimentacao" }), // só 10% acima
      tx({ type: "expense", amount: 100, date: "2026-03-01", category: "alimentacao" }),
      tx({ type: "expense", amount: 100, date: "2026-02-01", category: "alimentacao" }),
      tx({ type: "expense", amount: 100, date: "2026-01-01", category: "alimentacao" }),
    ];

    const insights = getFinancialInsights(transactions, categories, "2026-04", midMonth);

    expect(insights.find((i) => i.id === "category-outlier")).toBeUndefined();
  });

  it("projeta o fechamento do mês pelo ritmo de gastos, só para o mês corrente de verdade", () => {
    const transactions: Transaction[] = [
      tx({ type: "income", amount: 3000, date: "2026-04-01", category: "salario" }),
      // R$450 gastos em 15 dias -> projeção de R$900 no mês inteiro (30 dias)
      tx({ type: "expense", amount: 450, date: "2026-04-10", category: "alimentacao" }),
    ];

    const insights = getFinancialInsights(transactions, [], "2026-04", midMonth);

    const projection = insights.find((i) => i.id === "month-projection");
    expect(projection).toBeDefined();
    expect(projection?.kind).toBe("positive");
    expect(projection?.description).toContain(formatCurrency(2100));
  });

  it("não projeta fechamento de um mês que não é o mês corrente de verdade", () => {
    const transactions: Transaction[] = [
      tx({ type: "income", amount: 3000, date: "2026-03-01", category: "salario" }),
      tx({ type: "expense", amount: 450, date: "2026-03-10", category: "alimentacao" }),
    ];

    // "hoje" é 15/04, mas o mês analisado é março (já fechado)
    const insights = getFinancialInsights(transactions, [], "2026-03", midMonth);

    expect(insights.find((i) => i.id === "month-projection")).toBeUndefined();
  });

  it("não projeta fechamento antes do 5º dia do mês", () => {
    const earlyMonth = new Date(2026, 3, 3); // 03/04/2026
    const transactions: Transaction[] = [
      tx({ type: "expense", amount: 50, date: "2026-04-01", category: "alimentacao" }),
    ];

    const insights = getFinancialInsights(transactions, [], "2026-04", earlyMonth);

    expect(insights.find((i) => i.id === "month-projection")).toBeUndefined();
  });

  it("comenta taxa de poupança boa quando guarda uma parcela alta da renda", () => {
    const transactions: Transaction[] = [
      tx({ type: "income", amount: 1000, date: "2026-04-01", category: "salario" }),
      tx({ type: "expense", amount: 200, date: "2026-04-01", category: "alimentacao" }),
    ];

    const insights = getFinancialInsights(transactions, [], "2026-04", midMonth);

    const savings = insights.find((i) => i.id === "savings-rate");
    expect(savings).toBeDefined();
    expect(savings?.kind).toBe("positive");
  });

  it("avisa quando os gastos do mês passam a renda", () => {
    const transactions: Transaction[] = [
      tx({ type: "income", amount: 1000, date: "2026-04-01", category: "salario" }),
      tx({ type: "expense", amount: 1500, date: "2026-04-01", category: "alimentacao" }),
    ];

    const insights = getFinancialInsights(transactions, [], "2026-04", midMonth);

    const savings = insights.find((i) => i.id === "savings-rate");
    expect(savings).toBeDefined();
    expect(savings?.kind).toBe("warning");
  });

  it("não comenta taxa de poupança sem renda no mês", () => {
    const transactions: Transaction[] = [
      tx({ type: "expense", amount: 100, date: "2026-04-01", category: "alimentacao" }),
    ];

    const insights = getFinancialInsights(transactions, [], "2026-04", midMonth);

    expect(insights.find((i) => i.id === "savings-rate")).toBeUndefined();
  });

  it("retorna no máximo 3 insights", () => {
    const transactions: Transaction[] = [
      tx({ type: "income", amount: 1000, date: "2026-04-01", category: "salario" }),
      tx({ type: "expense", amount: 500, date: "2026-04-01", category: "alimentacao" }),
      tx({ type: "expense", amount: 100, date: "2026-03-01", category: "alimentacao" }),
      tx({ type: "expense", amount: 100, date: "2026-02-01", category: "alimentacao" }),
      tx({ type: "expense", amount: 100, date: "2026-01-01", category: "alimentacao" }),
    ];

    const insights = getFinancialInsights(transactions, categories, "2026-04", midMonth);

    expect(insights.length).toBeLessThanOrEqual(3);
  });

  it("retorna lista vazia sem transações", () => {
    expect(getFinancialInsights([], [], "2026-04", midMonth)).toEqual([]);
  });
});
