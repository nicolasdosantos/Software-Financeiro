import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { useAuth } from "./AuthContext";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string;
  notes?: string;
  // Nomeados em snake_case (fora do padrão camelCase do resto do arquivo) de
  // propósito: Transaction nunca teve um Row/mapXxx próprio — os campos vão
  // direto pro Supabase sem tradução (ver addTransaction/updateTransaction),
  // então o nome aqui precisa ser IGUAL ao nome da coluna no banco.
  recurring_id?: string | null;
  installment_number?: number | null;
  /** IDs iguais = partes da mesma transação dividida entre categorias (mesma
   * data/descrição, valor e categoria próprios cada). null = transação avulsa. */
  split_group_id?: string | null;
}

export interface SplitPart {
  categoryId: string;
  amount: number;
}

export interface NewSplitTransaction {
  type: TransactionType;
  description: string;
  date: string;
  notes?: string;
  /** Pelo menos 2 partes — cada uma vira uma transação real independente. */
  parts: SplitPart[];
}

/** null = recorrente indefinida (repete todo mês até ser cancelada);
 * um número = parcelado em N vezes (gerado tudo de uma vez na criação). */
export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  notes?: string;
  startDate: string;
  installmentsTotal: number | null;
  lastGeneratedDate: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "default" | "custom";
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  deadline: string;
  color: string;
  icon: string;
}

export interface Investment {
  id: string;
  name: string;
  type: string;
  invested: number;
  currentValue: number;
  startDate: string;
  institution: string;
}

/** "" (DEFAULT_BUDGET_MONTH) = limite padrão, vale em qualquer mês sem
 * override específico. "YYYY-MM" = limite só daquele mês, tem prioridade
 * sobre o padrão — ver getBudgetLimit. */
export interface Budget {
  categoryId: string;
  limit: number;
  month: string;
}

export const DEFAULT_BUDGET_MONTH = "";

export interface NewRecurringTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  notes?: string;
  startDate: string;
  /** null/undefined = recorrente indefinida; N (>1) = parcelado em N vezes. */
  installmentsTotal?: number | null;
}

interface FinanceContextType {
  transactions: Transaction[];
  categories: Category[];
  goals: Goal[];
  investments: Investment[];
  budgets: Budget[];
  recurringTransactions: RecurringTransaction[];
  loading: boolean;
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  addTransactionsBulk: (t: Omit<Transaction, "id">[]) => Promise<void>;
  updateTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addRecurringTransaction: (r: NewRecurringTransaction) => Promise<void>;
  cancelRecurringTransaction: (id: string) => Promise<void>;
  addSplitTransaction: (s: NewSplitTransaction) => Promise<void>;
  addCategory: (c: Omit<Category, "id">) => Promise<void>;
  updateCategory: (c: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addGoal: (g: Omit<Goal, "id">) => Promise<void>;
  updateGoal: (g: Goal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addInvestment: (i: Omit<Investment, "id">) => Promise<void>;
  updateInvestment: (i: Investment) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  updateBudget: (b: Budget) => Promise<void>;
  deleteBudget: (categoryId: string, month: string) => Promise<void>;
  currentMonth: string;
}

type GoalRow = {
  id: string;
  title: string;
  description: string | null;
  target: number;
  current: number;
  deadline: string;
  color: string;
  icon: string;
};
type InvestmentRow = {
  id: string;
  name: string;
  type: string;
  invested: number;
  current_value: number;
  start_date: string;
  institution: string | null;
};
type BudgetRow = {
  category_id: string;
  limit_amount: number;
  month: string;
};
type RecurringTransactionRow = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: string;
  notes: string | null;
  start_date: string;
  installments_total: number | null;
  last_generated_date: string;
  active: boolean;
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Alimentação", icon: "🍽️", color: "#f59e0b", type: "default" },
  { id: "cat-2", name: "Transporte", icon: "🚗", color: "#3b82f6", type: "default" },
  { id: "cat-3", name: "Moradia", icon: "🏠", color: "#8b5cf6", type: "default" },
  { id: "cat-4", name: "Saúde", icon: "❤️", color: "#ef4444", type: "default" },
  { id: "cat-5", name: "Educação", icon: "📚", color: "#10b981", type: "default" },
  { id: "cat-6", name: "Lazer", icon: "🎮", color: "#ec4899", type: "default" },
  { id: "cat-7", name: "Compras", icon: "🛒", color: "#3526c4", type: "default" },
  { id: "cat-8", name: "Investimentos", icon: "📈", color: "#10d9a4", type: "default" },
  { id: "cat-9", name: "Salário", icon: "💼", color: "#22c55e", type: "default" },
  { id: "cat-10", name: "Freelance", icon: "💻", color: "#6366f1", type: "default" },
  { id: "cat-11", name: "Outros", icon: "📦", color: "#94a3b8", type: "default" },
];

const todayMonth = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
};

export function getTodayDateInput(): string {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

export function toLocalDate(date: string): Date {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function toLocalMonthDate(month: string): Date {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1, 12);
}

export interface MonthTotals {
  income: number;
  expense: number;
  balance: number;
}

export function getMonthTotals(transactions: Transaction[], month: string): MonthTotals {
  const monthTransactions = transactions.filter((t) => t.date.startsWith(month));
  const income = monthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = monthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return { income, expense, balance: income - expense };
}

/**
 * Lista de meses ("YYYY-MM") com pelo menos uma transação, em ordem crescente.
 * `extraMonths` é útil para garantir que um mês sem transações (ex: o mês
 * corrente selecionado) apareça mesmo assim, ex: getDistinctMonths(txs, [currentMonth]).
 */
export function getDistinctMonths(transactions: Transaction[], extraMonths: string[] = []): string[] {
  return [...new Set([
    ...extraMonths,
    ...transactions.map((t) => t.date?.slice(0, 7)).filter((m): m is string => Boolean(m)),
  ])].sort();
}

/** Soma de despesas por categoria. Sem `month`, soma o histórico inteiro. */
export function sumExpensesByCategory(transactions: Transaction[], month?: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (month && !t.date.startsWith(month)) continue;
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }
  return totals;
}

/** Total gasto em uma categoria específica. Sem `month`, soma o histórico inteiro. */
export function getCategorySpend(transactions: Transaction[], categoryId: string, month?: string): number {
  return sumExpensesByCategory(transactions, month)[categoryId] || 0;
}

/** Saldo acumulado (receitas - despesas) de todas as transações até e incluindo `uptoMonth`. */
export function getAccumulatedBalance(transactions: Transaction[], uptoMonth: string): number {
  const relevant = transactions.filter((t) => (t.date?.slice(0, 7) ?? "") <= uptoMonth);
  const income = relevant.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = relevant.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  return income - expense;
}

/**
 * Limite efetivo de uma categoria num mês: usa o override daquele mês
 * específico quando existe, senão cai pro limite padrão (DEFAULT_BUDGET_MONTH).
 * Sem override nenhum, retorna 0 (sem limite definido).
 */
export function getBudgetLimit(budgets: Budget[], categoryId: string, month: string): number {
  const override = budgets.find((b) => b.categoryId === categoryId && b.month === month);
  if (override) return override.limit;
  const fallback = budgets.find((b) => b.categoryId === categoryId && b.month === DEFAULT_BUDGET_MONTH);
  return fallback?.limit ?? 0;
}

/** IDs distintos de categoria que têm algum limite configurado (padrão e/ou por mês). */
export function getBudgetCategoryIds(budgets: Budget[]): string[] {
  return [...new Set(budgets.map((b) => b.categoryId))];
}

/**
 * Soma `months` meses a uma data "YYYY-MM-DD", preservando o dia quando
 * possível e "encurtando" pro último dia do mês de destino quando não (ex:
 * 31/01 + 1 mês = 28 ou 29/02, nunca 03/03 — o que Date.setMonth faria
 * sozinho por conta do overflow de dias).
 */
export function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const targetIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return [targetYear, String(targetMonth + 1).padStart(2, "0"), String(clampedDay).padStart(2, "0")].join("-");
}

/** Quantos meses de calendário separam duas datas "YYYY-MM-DD" (só ano/mês, ignora o dia). */
function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function mapRecurringTransaction(row: RecurringTransactionRow): RecurringTransaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    categoryId: row.category_id,
    notes: row.notes ?? undefined,
    startDate: row.start_date,
    installmentsTotal: row.installments_total,
    lastGeneratedDate: row.last_generated_date,
    active: row.active,
  };
}

function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    target: Number(row.target),
    current: Number(row.current),
    deadline: row.deadline,
    color: row.color,
    icon: row.icon,
  };
}

function mapInvestment(row: InvestmentRow): Investment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    invested: Number(row.invested),
    currentValue: Number(row.current_value),
    startDate: row.start_date,
    institution: row.institution ?? "",
  };
}

function mapBudget(row: BudgetRow): Budget {
  return {
    categoryId: row.category_id,
    limit: Number(row.limit_amount),
    month: row.month,
  };
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  // "Mês atual" é só o mês-calendário de hoje — nada na UI deve poder mudá-lo
  // globalmente. Dashboard, Planejamento e Relatórios usam esse valor pra
  // saber "o que está acontecendo agora"; Gráficos e Controle Mensal, que
  // deixam o usuário navegar por outros meses, mantêm esse estado localmente
  // em vez de escrever aqui, senão navegar num gráfico mudaria sem aviso o
  // orçamento mostrado em Planejamento.
  const [currentMonth] = useState(todayMonth);

  // O usuário já vem resolvido pelo AuthProvider (uma única assinatura de
  // auth para o app inteiro) — não precisa de um supabase.auth.getUser()
  // extra a cada mutação, só validar que existe uma sessão em memória.
  const requireUser = useCallback(() => {
    if (!user) {
      toast.error("Sua sessão expirou. Faça login novamente para continuar.");
      throw new Error("Usuário não autenticado");
    }
    return user;
  }, [user]);

  const ensureDefaultCategories = useCallback(async (authUser: User, existing: Category[]) => {
    if (existing.length > 0) return existing;

    const { data, error } = await supabase
      .from("categories")
      .insert(DEFAULT_CATEGORIES.map((category) => ({ ...category, user_id: authUser.id })))
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      // "23505" = violação de unicidade (constraint categories_user_name_unique_idx).
      // Significa que outra aba/requisição já criou as categorias padrão
      // enquanto esta também tentava — não é uma falha real, só busca o que
      // já existe em vez de duplicar ou deixar o usuário sem categoria nenhuma.
      if (error.code === "23505") {
        const { data: refetched, error: refetchError } = await supabase
          .from("categories")
          .select("*")
          .eq("user_id", authUser.id)
          .order("name", { ascending: true });

        if (!refetchError && refetched && refetched.length > 0) {
          return refetched as Category[];
        }
      }

      console.error("Erro ao criar categorias padrão:", error);
      toast.error("Não foi possível criar suas categorias padrão. Tente recarregar a página.");
      return [];
    }

    return (data ?? []) as Category[];
  }, []);

  // Gera as ocorrências que uma série recorrente indefinida (installmentsTotal
  // null) "deveria" ter e ainda não tem, com base em quantos meses se
  // passaram desde a última geração. É isso que substitui um cron/job de
  // servidor, que este app não tem: a própria abertura do app, de vez em
  // quando, "põe em dia" as recorrências ativas. Parcelados não entram aqui
  // — já nascem com todas as ocorrências geradas de uma vez (ver
  // addRecurringTransaction) e ficam com active=false.
  const catchUpRecurringTransactions = useCallback(async (
    authUser: User,
    recurring: RecurringTransaction[],
    loadedTransactions: Transaction[],
  ): Promise<{ transactions: Transaction[]; recurring: RecurringTransaction[] }> => {
    const today = getTodayDateInput();
    let nextTransactions = loadedTransactions;
    let nextRecurring = recurring;

    for (const series of recurring) {
      if (!series.active || series.installmentsTotal !== null) continue;

      const monthsBehind = monthDiff(series.lastGeneratedDate, today);
      if (monthsBehind <= 0) continue;

      // Limite de segurança: uma série esquecida por anos (conta antiga,
      // período sem abrir o app) não deveria gerar centenas de lançamentos
      // de uma vez só na próxima abertura.
      const toGenerate = Math.min(monthsBehind, 24);
      const newRows = Array.from({ length: toGenerate }, (_, i) => ({
        type: series.type,
        amount: series.amount,
        description: series.description,
        category: series.categoryId,
        date: addMonths(series.lastGeneratedDate, i + 1),
        notes: series.notes,
        recurring_id: series.id,
        user_id: authUser.id,
      }));

      const { data, error } = await supabase.from("transactions").insert(newRows).select("*");
      if (error) {
        // Uma série com problema (ex: categoria apagada) não deveria travar
        // o carregamento das outras — só loga e segue pras próximas.
        console.error("Erro ao gerar ocorrências de transação recorrente:", error);
        continue;
      }

      nextTransactions = [...(data as Transaction[]), ...nextTransactions];

      const newLastGeneratedDate = addMonths(series.lastGeneratedDate, toGenerate);
      const { error: updateError } = await supabase
        .from("recurring_transactions")
        .update({ last_generated_date: newLastGeneratedDate })
        .eq("id", series.id)
        .eq("user_id", authUser.id);

      if (updateError) {
        console.error("Erro ao atualizar data da última ocorrência gerada:", updateError);
      }

      nextRecurring = nextRecurring.map((r) => r.id === series.id ? { ...r, lastGeneratedDate: newLastGeneratedDate } : r);
    }

    return { transactions: nextTransactions, recurring: nextRecurring };
  }, []);

  const loadFinanceData = useCallback(async (authUser: User | null) => {
    setLoading(true);

    try {
      if (!authUser) {
        setTransactions([]);
        setCategories([]);
        setGoals([]);
        setInvestments([]);
        setBudgets([]);
        setRecurringTransactions([]);
        return;
      }

      const [
        transactionsResult,
        categoriesResult,
        goalsResult,
        investmentsResult,
        budgetsResult,
        recurringResult,
      ] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", authUser.id).order("date", { ascending: false }),
        supabase.from("categories").select("*").eq("user_id", authUser.id).order("name", { ascending: true }),
        supabase.from("goals").select("*").eq("user_id", authUser.id).order("deadline", { ascending: true }),
        supabase.from("investments").select("*").eq("user_id", authUser.id).order("start_date", { ascending: false }),
        supabase.from("budgets").select("category_id, limit_amount, month").eq("user_id", authUser.id),
        supabase.from("recurring_transactions").select("*").eq("user_id", authUser.id),
      ]);

      const failures: string[] = [];
      if (transactionsResult.error) { console.error("Erro ao carregar transações:", transactionsResult.error); failures.push("transações"); }
      if (categoriesResult.error) { console.error("Erro ao carregar categorias:", categoriesResult.error); failures.push("categorias"); }
      if (goalsResult.error) { console.error("Erro ao carregar metas:", goalsResult.error); failures.push("metas"); }
      if (investmentsResult.error) { console.error("Erro ao carregar investimentos:", investmentsResult.error); failures.push("investimentos"); }
      if (budgetsResult.error) { console.error("Erro ao carregar orçamentos:", budgetsResult.error); failures.push("orçamentos"); }
      if (recurringResult.error) { console.error("Erro ao carregar transações recorrentes:", recurringResult.error); failures.push("transações recorrentes"); }

      if (failures.length > 0) {
        toast.error(`Não foi possível carregar: ${failures.join(", ")}. Tente recarregar a página.`);
      }

      const userCategories = await ensureDefaultCategories(authUser, (categoriesResult.data ?? []) as Category[]);
      const loadedRecurring = ((recurringResult.data ?? []) as RecurringTransactionRow[]).map(mapRecurringTransaction);
      const loadedTransactions = (transactionsResult.data ?? []) as Transaction[];

      const { transactions: finalTransactions, recurring: finalRecurring } = recurringResult.error
        ? { transactions: loadedTransactions, recurring: loadedRecurring }
        : await catchUpRecurringTransactions(authUser, loadedRecurring, loadedTransactions);

      setTransactions(finalTransactions);
      setCategories(userCategories);
      setGoals(((goalsResult.data ?? []) as GoalRow[]).map(mapGoal));
      setInvestments(((investmentsResult.data ?? []) as InvestmentRow[]).map(mapInvestment));
      setBudgets(((budgetsResult.data ?? []) as BudgetRow[]).map(mapBudget));
      setRecurringTransactions(finalRecurring);
    } catch (err) {
      console.error("Erro inesperado ao carregar dados financeiros:", err);
      toast.error("Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [ensureDefaultCategories, catchUpRecurringTransactions]);

  useEffect(() => {
    // Espera o AuthProvider resolver a sessão inicial antes de decidir se
    // carrega dados de um usuário ou limpa tudo (evita um fetch "sem
    // usuário" só porque a sessão ainda não chegou do storage).
    if (authLoading) return;
    loadFinanceData(user);
    // user?.id (não o objeto `user`) é o que realmente deve disparar um novo
    // carregamento — o objeto de sessão é recriado a cada refresh de token
    // (a cada ~1h) mesmo sendo o mesmo usuário, e isso não deveria refazer
    // as 5 queries de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, loadFinanceData]);

  const value = useMemo<FinanceContextType>(() => ({
    transactions,
    categories,
    goals,
    investments,
    budgets,
    recurringTransactions,
    loading,
    currentMonth,

    addTransaction: async (transaction) => {
      const user = await requireUser();

      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...transaction, user_id: user.id })
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao adicionar transação:", error);
        toast.error("Não foi possível adicionar a transação. Tente novamente.");
        throw error;
      }

      setTransactions((prev) => [data as Transaction, ...prev]);
    },

    // Usado pela importação de extrato (CSV/OFX) — um insert só pra todas as
    // transações da vez, em vez de N chamadas de addTransaction em sequência.
    addTransactionsBulk: async (transactions) => {
      if (transactions.length === 0) return;
      const user = await requireUser();

      const rows = transactions.map((t) => ({ ...t, user_id: user.id }));
      const { data, error } = await supabase.from("transactions").insert(rows).select("*");

      if (error) {
        console.error("Erro ao importar transações:", error);
        toast.error("Não foi possível importar as transações.");
        throw error;
      }

      setTransactions((prev) => [...(data as Transaction[]), ...prev]);
    },

    updateTransaction: async (transaction) => {
      const user = await requireUser();

      const { id, ...payload } = transaction;
      const { error } = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao atualizar transação:", error);
        toast.error("Não foi possível salvar as alterações da transação.");
        throw error;
      }

      setTransactions((prev) => prev.map((item) => item.id === id ? transaction : item));
    },

    deleteTransaction: async (id) => {
      const user = await requireUser();

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao excluir transação:", error);
        toast.error("Não foi possível excluir a transação.");
        throw error;
      }

      setTransactions((prev) => prev.filter((item) => item.id !== id));
    },

    addRecurringTransaction: async (input) => {
      const user = await requireUser();

      const installmentsTotal = input.installmentsTotal ?? null;
      // Parcelado: gera as N ocorrências de uma vez e a série nasce
      // "concluída" (active=false — nada mais pra gerar, nunca). Recorrente
      // indefinida: gera só a 1ª ocorrência agora e fica active=true —
      // catchUpRecurringTransactions (ver loadFinanceData) gera as próximas
      // conforme os meses forem passando.
      const occurrences = installmentsTotal ?? 1;
      const lastDate = addMonths(input.startDate, occurrences - 1);

      const { data: seriesData, error: seriesError } = await supabase
        .from("recurring_transactions")
        .insert({
          user_id: user.id,
          type: input.type,
          amount: input.amount,
          description: input.description,
          category_id: input.categoryId,
          notes: input.notes || null,
          start_date: input.startDate,
          installments_total: installmentsTotal,
          last_generated_date: lastDate,
          active: installmentsTotal === null,
        })
        .select("*")
        .single();

      if (seriesError) {
        console.error("Erro ao criar transação recorrente:", seriesError);
        toast.error("Não foi possível criar a recorrência.");
        throw seriesError;
      }

      const series = mapRecurringTransaction(seriesData as RecurringTransactionRow);

      const rows = Array.from({ length: occurrences }, (_, i) => ({
        type: input.type,
        amount: input.amount,
        description: input.description,
        category: input.categoryId,
        date: addMonths(input.startDate, i),
        notes: input.notes || null,
        recurring_id: series.id,
        installment_number: installmentsTotal ? i + 1 : null,
        user_id: user.id,
      }));

      const { data: txData, error: txError } = await supabase.from("transactions").insert(rows).select("*");

      if (txError) {
        console.error("Erro ao gerar transações da recorrência:", txError);
        toast.error("A recorrência foi criada, mas houve um erro ao gerar as transações. Tente recarregar a página.");
        throw txError;
      }

      setRecurringTransactions((prev) => [...prev, series]);
      setTransactions((prev) => [...(txData as Transaction[]), ...prev]);
    },

    // Só impede que a série gere novas ocorrências no futuro — não apaga o
    // que já foi lançado, porque isso já é dinheiro real que entrou/saiu.
    cancelRecurringTransaction: async (id) => {
      const user = await requireUser();

      const { error } = await supabase
        .from("recurring_transactions")
        .update({ active: false })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao cancelar transação recorrente:", error);
        toast.error("Não foi possível cancelar a recorrência.");
        throw error;
      }

      setRecurringTransactions((prev) => prev.map((r) => r.id === id ? { ...r, active: false } : r));
    },

    // Cada parte vira uma transação real e independente, ligada só pelo
    // split_group_id — não existe "objeto grupo" pra manter sincronizado.
    // Editar ou apagar uma parte depois funciona com updateTransaction/
    // deleteTransaction normais, sem nenhum caso especial: a parte deletada
    // simplesmente deixa de existir, as outras continuam válidas sozinhas.
    addSplitTransaction: async (input) => {
      const user = await requireUser();

      const splitGroupId = crypto.randomUUID();
      const rows = input.parts.map((part) => ({
        type: input.type,
        amount: part.amount,
        description: input.description,
        category: part.categoryId,
        date: input.date,
        notes: input.notes || null,
        split_group_id: splitGroupId,
        user_id: user.id,
      }));

      const { data, error } = await supabase.from("transactions").insert(rows).select("*");

      if (error) {
        console.error("Erro ao criar transação dividida:", error);
        toast.error("Não foi possível criar a transação dividida.");
        throw error;
      }

      setTransactions((prev) => [...(data as Transaction[]), ...prev]);
    },

    addCategory: async (category) => {
      const user = await requireUser();

      const { data, error } = await supabase
        .from("categories")
        .insert({ ...category, user_id: user.id })
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao adicionar categoria:", error);
        toast.error("Não foi possível adicionar a categoria.");
        throw error;
      }

      setCategories((prev) => [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name)));
    },

    updateCategory: async (category) => {
      const user = await requireUser();

      const { id, ...payload } = category;
      const { error } = await supabase
        .from("categories")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao atualizar categoria:", error);
        toast.error("Não foi possível salvar as alterações da categoria.");
        throw error;
      }

      setCategories((prev) => prev.map((item) => item.id === id ? category : item));
    },

    deleteCategory: async (id) => {
      const user = await requireUser();

      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("type", "custom");

      if (error) {
        console.error("Erro ao excluir categoria:", error);
        toast.error("Não foi possível excluir a categoria.");
        throw error;
      }

      setCategories((prev) => prev.filter((item) => item.id !== id));
      setBudgets((prev) => prev.filter((item) => item.categoryId !== id));
    },

    addGoal: async (goal) => {
      const user = await requireUser();

      const { data, error } = await supabase
        .from("goals")
        .insert({ ...goal, user_id: user.id })
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao adicionar meta:", error);
        toast.error("Não foi possível adicionar a meta.");
        throw error;
      }

      setGoals((prev) => [...prev, mapGoal(data as GoalRow)]);
    },

    updateGoal: async (goal) => {
      const user = await requireUser();

      const { id, ...payload } = goal;
      const { error } = await supabase
        .from("goals")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao atualizar meta:", error);
        toast.error("Não foi possível salvar as alterações da meta.");
        throw error;
      }

      setGoals((prev) => prev.map((item) => item.id === id ? goal : item));
    },

    deleteGoal: async (id) => {
      const user = await requireUser();

      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao excluir meta:", error);
        toast.error("Não foi possível excluir a meta.");
        throw error;
      }

      setGoals((prev) => prev.filter((item) => item.id !== id));
    },

    addInvestment: async (investment) => {
      const user = await requireUser();

      const { currentValue, startDate, ...payload } = investment;
      const { data, error } = await supabase
        .from("investments")
        .insert({
          ...payload,
          current_value: currentValue,
          start_date: startDate,
          user_id: user.id,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao adicionar investimento:", error);
        toast.error("Não foi possível adicionar o investimento.");
        throw error;
      }

      setInvestments((prev) => [mapInvestment(data as InvestmentRow), ...prev]);
    },

    updateInvestment: async (investment) => {
      const user = await requireUser();

      const { id, currentValue, startDate, ...payload } = investment;
      const { error } = await supabase
        .from("investments")
        .update({
          ...payload,
          current_value: currentValue,
          start_date: startDate,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao atualizar investimento:", error);
        toast.error("Não foi possível salvar as alterações do investimento.");
        throw error;
      }

      setInvestments((prev) => prev.map((item) => item.id === id ? investment : item));
    },

    deleteInvestment: async (id) => {
      const user = await requireUser();

      const { error } = await supabase
        .from("investments")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao excluir investimento:", error);
        toast.error("Não foi possível excluir o investimento.");
        throw error;
      }

      setInvestments((prev) => prev.filter((item) => item.id !== id));
    },

    updateBudget: async (budget) => {
      const user = await requireUser();

      const { error } = await supabase
        .from("budgets")
        .upsert({
          user_id: user.id,
          category_id: budget.categoryId,
          limit_amount: budget.limit,
          month: budget.month,
        }, { onConflict: "user_id,category_id,month" });

      if (error) {
        console.error("Erro ao atualizar orçamento:", error);
        toast.error("Não foi possível salvar o limite de orçamento.");
        throw error;
      }

      setBudgets((prev) => {
        const exists = prev.some((item) => item.categoryId === budget.categoryId && item.month === budget.month);
        return exists
          ? prev.map((item) => item.categoryId === budget.categoryId && item.month === budget.month ? budget : item)
          : [...prev, budget];
      });
    },

    deleteBudget: async (categoryId, month) => {
      const user = await requireUser();

      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("user_id", user.id)
        .eq("category_id", categoryId)
        .eq("month", month);

      if (error) {
        console.error("Erro ao remover limite de orçamento:", error);
        toast.error("Não foi possível remover o limite de orçamento.");
        throw error;
      }

      setBudgets((prev) => prev.filter((item) => !(item.categoryId === categoryId && item.month === month)));
    },
  }), [
    budgets,
    categories,
    currentMonth,
    requireUser,
    goals,
    investments,
    loading,
    transactions,
    recurringTransactions,
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function getMonthName(month: string): string {
  return toLocalMonthDate(month).toLocaleString("pt-BR", { month: "long", year: "numeric" });
}

export function getShortMonthName(month: string): string {
  return toLocalMonthDate(month).toLocaleString("pt-BR", { month: "short" });
}
