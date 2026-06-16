import React, { createContext, useContext, useState, useEffect } from "react";
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

const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Alimentação", icon: "🍽️", color: "#f59e0b", type: "default" },
  { id: "cat-2", name: "Transporte", icon: "🚗", color: "#3b82f6", type: "default" },
  { id: "cat-3", name: "Moradia", icon: "🏠", color: "#8b5cf6", type: "default" },
  { id: "cat-4", name: "Saúde", icon: "❤️", color: "#ef4444", type: "default" },
  { id: "cat-5", name: "Educação", icon: "📚", color: "#10b981", type: "default" },
  { id: "cat-6", name: "Lazer", icon: "🎮", color: "#ec4899", type: "default" },
  { id: "cat-7", name: "Investimentos", icon: "📈", color: "#10d9a4", type: "default" },
  { id: "cat-8", name: "Salário", icon: "💼", color: "#22c55e", type: "default" },
  { id: "cat-9", name: "Freelance", icon: "💻", color: "#6366f1", type: "default" },
  { id: "cat-10", name: "Outros", icon: "📦", color: "#94a3b8", type: "default" },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "t1", type: "income", amount: 8500, description: "Salário maio", category: "cat-8", date: "2026-05-05" },
  { id: "t2", type: "expense", amount: 2200, description: "Aluguel maio", category: "cat-3", date: "2026-05-07" },
  { id: "t3", type: "expense", amount: 850, description: "Supermercado Extra", category: "cat-1", date: "2026-05-10" },
  { id: "t4", type: "expense", amount: 320, description: "Gasolina", category: "cat-2", date: "2026-05-12" },
  { id: "t5", type: "expense", amount: 89.90, description: "Netflix + Spotify", category: "cat-6", date: "2026-05-15" },
  { id: "t6", type: "expense", amount: 150, description: "Academia Smart Fit", category: "cat-4", date: "2026-05-15" },
  { id: "t7", type: "expense", amount: 230, description: "Farmácia", category: "cat-4", date: "2026-05-18" },
  { id: "t8", type: "expense", amount: 280, description: "Restaurante Dom", category: "cat-1", date: "2026-05-20" },
  { id: "t9", type: "expense", amount: 95, description: "Uber", category: "cat-2", date: "2026-05-22" },
  { id: "t10", type: "expense", amount: 180, description: "Energia elétrica", category: "cat-3", date: "2026-05-25" },
  { id: "t11", type: "expense", amount: 120, description: "Internet Vivo", category: "cat-3", date: "2026-05-25" },
  { id: "t12", type: "income", amount: 2000, description: "Projeto freelance", category: "cat-9", date: "2026-05-28" },
  { id: "t13", type: "income", amount: 8500, description: "Salário junho", category: "cat-8", date: "2026-06-05" },
  { id: "t14", type: "expense", amount: 2200, description: "Aluguel junho", category: "cat-3", date: "2026-06-07" },
  { id: "t15", type: "expense", amount: 720, description: "Supermercado", category: "cat-1", date: "2026-06-08" },
  { id: "t16", type: "expense", amount: 280, description: "Gasolina Shell", category: "cat-2", date: "2026-06-10" },
  { id: "t17", type: "expense", amount: 450, description: "Curso React Avançado", category: "cat-5", date: "2026-06-10" },
  { id: "t18", type: "expense", amount: 150, description: "Academia", category: "cat-4", date: "2026-06-10" },
  { id: "t19", type: "expense", amount: 340, description: "Jantar aniversário", category: "cat-1", date: "2026-06-11" },
  { id: "t20", type: "expense", amount: 1000, description: "Aporte CDB", category: "cat-7", date: "2026-06-12" },
  { id: "t21", type: "expense", amount: 195, description: "Energia elétrica", category: "cat-3", date: "2026-06-12" },
  { id: "t22", type: "expense", amount: 120, description: "Internet", category: "cat-3", date: "2026-06-12" },
];

const INITIAL_GOALS: Goal[] = [
  { id: "g1", title: "Reserva de Emergência", description: "6 meses de despesas", target: 30000, current: 18500, deadline: "2026-12-31", color: "#10d9a4", icon: "🛡️" },
  { id: "g2", title: "Viagem Europa", description: "Férias em Portugal e Espanha", target: 15000, current: 6200, deadline: "2027-06-30", color: "#204bca", icon: "✈️" },
  { id: "g3", title: "MacBook Pro", description: "Upgrade do setup de trabalho", target: 12000, current: 9800, deadline: "2026-09-30", color: "#8b5cf6", icon: "💻" },
];

const INITIAL_INVESTMENTS: Investment[] = [
  { id: "i1", name: "CDB Banco Inter", type: "Renda Fixa", invested: 15000, currentValue: 16240, startDate: "2025-01-10", institution: "Banco Inter" },
  { id: "i2", name: "Tesouro Direto IPCA+", type: "Renda Fixa", invested: 8000, currentValue: 8890, startDate: "2025-03-15", institution: "Tesouro Nacional" },
  { id: "i3", name: "Ações ITUB4", type: "Renda Variável", invested: 5000, currentValue: 5830, startDate: "2025-06-01", institution: "XP Investimentos" },
  { id: "i4", name: "Fundo Imobiliário MXRF11", type: "FII", invested: 3000, currentValue: 3210, startDate: "2025-08-20", institution: "Clear Corretora" },
];

const INITIAL_BUDGETS: Budget[] = [
  { categoryId: "cat-1", limit: 1000 },
  { categoryId: "cat-2", limit: 500 },
  { categoryId: "cat-3", limit: 2500 },
  { categoryId: "cat-4", limit: 400 },
  { categoryId: "cat-5", limit: 600 },
  { categoryId: "cat-6", limit: 300 },
  { categoryId: "cat-7", limit: 1500 },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

interface FinanceContextType {
  transactions: Transaction[];
  categories: Category[];
  goals: Goal[];
  investments: Investment[];
  budgets: Budget[];
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (c: Omit<Category, "id">) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  addGoal: (g: Omit<Goal, "id">) => void;
  updateGoal: (g: Goal) => void;
  deleteGoal: (id: string) => void;
  addInvestment: (i: Omit<Investment, "id">) => void;
  updateInvestment: (i: Investment) => void;
  deleteInvestment: (id: string) => void;
  updateBudget: (b: Budget) => void;
  currentMonth: string;
  setCurrentMonth: (m: string) => void;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(() =>
    loadFromStorage("fp_categories", DEFAULT_CATEGORIES)
  );
  const [goals, setGoals] = useState<Goal[]>(() =>
    loadFromStorage("fp_goals", INITIAL_GOALS)
  );
  const [investments, setInvestments] = useState<Investment[]>(() =>
    loadFromStorage("fp_investments", INITIAL_INVESTMENTS)
  );
  const [budgets, setBudgets] = useState<Budget[]>(() =>
    loadFromStorage("fp_budgets", INITIAL_BUDGETS)
  );
  const [currentMonth, setCurrentMonth] = useState("2026-06");


  useEffect(() => {
    loadTransactions();
  }, []);

  async function getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  }

  async function loadTransactions() {
    const user = await getCurrentUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      console.error("Erro ao carregar transações:", error);
      return;
    }

    setTransactions(data || []);
  }

  useEffect(() => {
    localStorage.setItem(
      "fp_categories",
      JSON.stringify(categories)
    );
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(
      "fp_goals",
      JSON.stringify(goals)
    );
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(
      "fp_investments",
      JSON.stringify(investments)
    );
  }, [investments]);

  useEffect(() => {
    localStorage.setItem(
      "fp_budgets",
      JSON.stringify(budgets)
    );
  }, [budgets]);

  const uid = () =>
    Math.random().toString(36).slice(2, 10);


  return (
    <FinanceContext.Provider value={{
      transactions,
      categories,
      goals,
      investments,
      budgets,
      currentMonth,
      setCurrentMonth,

      addTransaction: async (t) => {
        const user = await getCurrentUser();

        if (!user) return;

        const { data, error } = await supabase
          .from("transactions")
          .insert({
            user_id: user.id,
            type: t.type,
            amount: t.amount,
            description: t.description,
            category: t.category,
            date: t.date,
            notes: t.notes
          })
          .select()
          .single();

        if (error) {
          console.error(error);
          return;
        }

        setTransactions(prev => [
          data as Transaction,
          ...prev
        ]);
      },

      updateTransaction: async (t) => {
        const user = await getCurrentUser();

        if (!user) return;

        const { error } = await supabase
          .from("transactions")
          .update({
            type: t.type,
            amount: t.amount,
            description: t.description,
            category: t.category,
            date: t.date,
            notes: t.notes
          })
          .eq("id", t.id)
          .eq("user_id", user.id);

        if (error) {
          console.error(error);
          return;
        }

        setTransactions(prev =>
          prev.map(x => x.id === t.id ? t : x)
        );
      }, deleteTransaction: async (id) => {

        const user = await getCurrentUser();

        if (!user) return;

        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) {
          console.error(error);
          return;
        }

        setTransactions(prev =>
          prev.filter(x => x.id !== id)
        );
      },
      addCategory: (c) => setCategories(prev => [...prev, { ...c, id: uid() }]),
      updateCategory: (c) => setCategories(prev => prev.map(x => x.id === c.id ? c : x)),
      deleteCategory: (id) => setCategories(prev => prev.filter(x => x.id !== id)),
      addGoal: (g) => setGoals(prev => [...prev, { ...g, id: uid() }]),
      updateGoal: (g) => setGoals(prev => prev.map(x => x.id === g.id ? g : x)),
      deleteGoal: (id) => setGoals(prev => prev.filter(x => x.id !== id)),
      addInvestment: (i) => setInvestments(prev => [...prev, { ...i, id: uid() }]),
      updateInvestment: (i) => setInvestments(prev => prev.map(x => x.id === i.id ? i : x)),
      deleteInvestment: (id) => setInvestments(prev => prev.filter(x => x.id !== id)),
      updateBudget: (b) => setBudgets(prev => {
        const idx = prev.findIndex(x => x.categoryId === b.categoryId);
        return idx >= 0 ? prev.map(x => x.categoryId === b.categoryId ? b : x) : [...prev, b];
      }),
    }}>
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
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleString("pt-BR", { month: "long", year: "numeric" });
}
