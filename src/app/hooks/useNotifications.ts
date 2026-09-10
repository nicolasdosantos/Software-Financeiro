import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  useFinance,
  getCategorySpend,
  getMonthTotals,
  getMonthName,
  formatCurrency,
} from "../context/FinanceContext";

export type NotificationKind = "budgetAlert" | "goalUpdate" | "weeklyReport" | "monthlyBalance";

export interface AppNotification {
  /** Estável enquanto a condição que gerou a notificação não mudar — é o que
   * permite "já vi essa" persistir (ver useDismissedNotifications) e o que
   * faz uma nova notificação aparecer sozinha quando o mês/semana vira ou o
   * gasto sobe de faixa, sem precisar de nenhum backend agendando nada. */
  id: string;
  title: string;
  description: string;
  kind: NotificationKind;
}

interface NotificationPrefs {
  budgetAlert: boolean;
  weeklyReport: boolean;
  goalUpdate: boolean;
  monthlyBalance: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  budgetAlert: true,
  weeklyReport: true,
  goalUpdate: false,
  monthlyBalance: true,
};

function formatDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Segunda-feira da semana de `date` (base da janela "relatório semanal"). */
function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = domingo ... 6 = sábado
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Notificações reais, calculadas a partir dos dados financeiros já
 * carregados — nada aqui é enviado por e-mail/push (o app não tem esse tipo
 * de infraestrutura), mas o conteúdo é genuíno: reflete o que está
 * acontecendo nas transações, orçamentos e metas do usuário agora, e some
 * sozinho quando a condição deixa de valer.
 */
export function useNotifications(): AppNotification[] {
  const { user } = useAuth();
  const { transactions, categories, goals, budgets, currentMonth, loading } = useFinance();

  const prefs: NotificationPrefs = {
    ...DEFAULT_PREFS,
    ...(user?.user_metadata?.notifications as Partial<NotificationPrefs> | undefined),
  };

  return useMemo(() => {
    if (loading) return [];
    const list: AppNotification[] = [];

    if (prefs.budgetAlert) {
      for (const budget of budgets) {
        if (budget.limit <= 0) continue;
        const spend = getCategorySpend(transactions, budget.categoryId, currentMonth);
        const ratio = spend / budget.limit;
        if (ratio < 0.8) continue;

        const categoryName = categories.find((c) => c.id === budget.categoryId)?.name ?? "categoria";
        const over = ratio >= 1;
        list.push({
          // A faixa (near/over) entra no id de propósito: dispensar o aviso
          // de "perto do limite" não silencia o de "estourou" quando o gasto
          // continuar subindo depois — e o mês novo reseta os dois.
          id: `budget-${budget.categoryId}-${currentMonth}-${over ? "over" : "near"}`,
          title: over ? `Limite de ${categoryName} estourado` : `${categoryName} perto do limite`,
          description: `Já foram ${formatCurrency(spend)} de ${formatCurrency(budget.limit)} (${Math.round(ratio * 100)}%) neste mês.`,
          kind: "budgetAlert",
        });
      }
    }

    if (prefs.goalUpdate) {
      for (const goal of goals) {
        if (goal.target <= 0 || goal.current < goal.target) continue;
        list.push({
          id: `goal-${goal.id}`,
          title: "Meta atingida! 🎉",
          description: `Você alcançou a meta "${goal.title}" (${formatCurrency(goal.target)}).`,
          kind: "goalUpdate",
        });
      }
    }

    if (prefs.monthlyBalance) {
      const totals = getMonthTotals(transactions, currentMonth);
      list.push({
        id: `monthly-${currentMonth}`,
        title: `Balanço de ${getMonthName(currentMonth)}`,
        description: `Receitas ${formatCurrency(totals.income)} · Despesas ${formatCurrency(totals.expense)} · Saldo ${formatCurrency(totals.balance)}.`,
        kind: "monthlyBalance",
      });
    }

    if (prefs.weeklyReport) {
      const today = new Date();
      const weekStart = mondayOf(today);
      const weekStartStr = formatDate(weekStart);
      const todayStr = formatDate(today);
      const weekTransactions = transactions.filter((t) => t.date >= weekStartStr && t.date <= todayStr);
      const income = weekTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const expense = weekTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

      list.push({
        id: `week-${weekStartStr}`,
        title: "Resumo da semana",
        description: `Desde segunda: receitas ${formatCurrency(income)} · despesas ${formatCurrency(expense)}.`,
        kind: "weeklyReport",
      });
    }

    return list;
  }, [loading, prefs.budgetAlert, prefs.goalUpdate, prefs.monthlyBalance, prefs.weeklyReport, budgets, transactions, categories, goals, currentMonth]);
}
