import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string;
  notes?: string;
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

export interface Budget {
  categoryId: string;
  limit: number;
}

interface FinanceContextType {
  transactions: Transaction[];
  categories: Category[];
  goals: Goal[];
  investments: Investment[];
  budgets: Budget[];
  loading: boolean;
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
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
  currentMonth: string;
  setCurrentMonth: (m: string) => void;
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
  };
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(todayMonth);

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }, []);

  const ensureDefaultCategories = useCallback(async (user: User, existing: Category[]) => {
    if (existing.length > 0) return existing;

    const { data, error } = await supabase
      .from("categories")
      .insert(DEFAULT_CATEGORIES.map((category) => ({ ...category, user_id: user.id })))
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao criar categorias padrão:", error);
      return [];
    }

    return (data ?? []) as Category[];
  }, []);

  const loadFinanceData = useCallback(async () => {
    setLoading(true);

    const user = await getCurrentUser();
    if (!user) {
      setTransactions([]);
      setCategories([]);
      setGoals([]);
      setInvestments([]);
      setBudgets([]);
      setLoading(false);
      return;
    }

    const [
      transactionsResult,
      categoriesResult,
      goalsResult,
      investmentsResult,
      budgetsResult,
    ] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("categories").select("*").eq("user_id", user.id).order("name", { ascending: true }),
      supabase.from("goals").select("*").eq("user_id", user.id).order("deadline", { ascending: true }),
      supabase.from("investments").select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
      supabase.from("budgets").select("category_id, limit_amount").eq("user_id", user.id),
    ]);

    if (transactionsResult.error) console.error("Erro ao carregar transações:", transactionsResult.error);
    if (categoriesResult.error) console.error("Erro ao carregar categorias:", categoriesResult.error);
    if (goalsResult.error) console.error("Erro ao carregar metas:", goalsResult.error);
    if (investmentsResult.error) console.error("Erro ao carregar investimentos:", investmentsResult.error);
    if (budgetsResult.error) console.error("Erro ao carregar orçamentos:", budgetsResult.error);

    const userCategories = await ensureDefaultCategories(user, (categoriesResult.data ?? []) as Category[]);

    setTransactions((transactionsResult.data ?? []) as Transaction[]);
    setCategories(userCategories);
    setGoals(((goalsResult.data ?? []) as GoalRow[]).map(mapGoal));
    setInvestments(((investmentsResult.data ?? []) as InvestmentRow[]).map(mapInvestment));
    setBudgets(((budgetsResult.data ?? []) as BudgetRow[]).map(mapBudget));
    setLoading(false);
  }, [ensureDefaultCategories, getCurrentUser]);

  useEffect(() => {
    loadFinanceData();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadFinanceData();
    });

    return () => listener.subscription.unsubscribe();
  }, [loadFinanceData]);

  const value = useMemo<FinanceContextType>(() => ({
    transactions,
    categories,
    goals,
    investments,
    budgets,
    loading,
    currentMonth,
    setCurrentMonth,

    addTransaction: async (transaction) => {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...transaction, user_id: user.id })
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao adicionar transação:", error);
        return;
      }

      setTransactions((prev) => [data as Transaction, ...prev]);
    },

    updateTransaction: async (transaction) => {
      const user = await getCurrentUser();
      if (!user) return;

      const { id, ...payload } = transaction;
      const { error } = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao atualizar transação:", error);
        return;
      }

      setTransactions((prev) => prev.map((item) => item.id === id ? transaction : item));
    },

    deleteTransaction: async (id) => {
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao excluir transação:", error);
        return;
      }

      setTransactions((prev) => prev.filter((item) => item.id !== id));
    },

    addCategory: async (category) => {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("categories")
        .insert({ ...category, user_id: user.id })
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao adicionar categoria:", error);
        return;
      }

      setCategories((prev) => [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name)));
    },

    updateCategory: async (category) => {
      const user = await getCurrentUser();
      if (!user) return;

      const { id, ...payload } = category;
      const { error } = await supabase
        .from("categories")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao atualizar categoria:", error);
        return;
      }

      setCategories((prev) => prev.map((item) => item.id === id ? category : item));
    },

    deleteCategory: async (id) => {
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("type", "custom");

      if (error) {
        console.error("Erro ao excluir categoria:", error);
        return;
      }

      setCategories((prev) => prev.filter((item) => item.id !== id));
      setBudgets((prev) => prev.filter((item) => item.categoryId !== id));
    },

    addGoal: async (goal) => {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("goals")
        .insert({ ...goal, user_id: user.id })
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao adicionar meta:", error);
        return;
      }

      setGoals((prev) => [...prev, mapGoal(data as GoalRow)]);
    },

    updateGoal: async (goal) => {
      const user = await getCurrentUser();
      if (!user) return;

      const { id, ...payload } = goal;
      const { error } = await supabase
        .from("goals")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao atualizar meta:", error);
        return;
      }

      setGoals((prev) => prev.map((item) => item.id === id ? goal : item));
    },

    deleteGoal: async (id) => {
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao excluir meta:", error);
        return;
      }

      setGoals((prev) => prev.filter((item) => item.id !== id));
    },

    addInvestment: async (investment) => {
      const user = await getCurrentUser();
      if (!user) return;

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
        return;
      }

      setInvestments((prev) => [mapInvestment(data as InvestmentRow), ...prev]);
    },

    updateInvestment: async (investment) => {
      const user = await getCurrentUser();
      if (!user) return;

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
        return;
      }

      setInvestments((prev) => prev.map((item) => item.id === id ? investment : item));
    },

    deleteInvestment: async (id) => {
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from("investments")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao excluir investimento:", error);
        return;
      }

      setInvestments((prev) => prev.filter((item) => item.id !== id));
    },

    updateBudget: async (budget) => {
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from("budgets")
        .upsert({
          user_id: user.id,
          category_id: budget.categoryId,
          limit_amount: budget.limit,
        }, { onConflict: "user_id,category_id" });

      if (error) {
        console.error("Erro ao atualizar orçamento:", error);
        return;
      }

      setBudgets((prev) => {
        const exists = prev.some((item) => item.categoryId === budget.categoryId);
        return exists
          ? prev.map((item) => item.categoryId === budget.categoryId ? budget : item)
          : [...prev, budget];
      });
    },
  }), [
    budgets,
    categories,
    currentMonth,
    getCurrentUser,
    goals,
    investments,
    loading,
    transactions,
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
