import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  getAccumulatedBalance,
  getCategorySpend,
  getDistinctMonths,
  getMonthName,
  getMonthTotals,
  getShortMonthName,
  getTodayDateInput,
  sumExpensesByCategory,
  toLocalDate,
  toLocalMonthDate,
} from "./FinanceContext";
import type { Transaction } from "./FinanceContext";

function tx(overrides: Partial<Transaction> & Pick<Transaction, "type" | "amount" | "date" | "category">): Transaction {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    description: overrides.description ?? "Transação de teste",
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
