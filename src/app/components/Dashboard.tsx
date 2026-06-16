import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, Eye, EyeOff } from "lucide-react";
import { useFinance, formatCurrency } from "../context/FinanceContext";

function AnimatedCounter({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const end = value;
    const duration = 1200;
    const step = (end - 0) / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) { setDisplayed(end); clearInterval(timer); }
      else setDisplayed(current);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{formatCurrency(displayed)}</span>;
}

export function Dashboard() {
  const { transactions, categories } = useFinance();
  const [hideValues, setHideValues] = useState(false);

  const currentMonth = "2026-06";
  const prevMonth = "2026-05";

  function monthTotals(month: string) {
    const txs = transactions.filter(t => t.date.startsWith(month));
    const income = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }

  const curr = monthTotals(currentMonth);
  const prev = monthTotals(prevMonth);
  const savings = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
    - transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const statCards = [
    { title: "Saldo Total", value: savings, icon: Wallet, color: "#204bca", bg: "rgba(32,75,202,0.12)", change: "+12,3%", up: true },
    { title: "Receitas (Jun)", value: curr.income, icon: TrendingUp, color: "#10d9a4", bg: "rgba(16,217,164,0.12)", change: `${((curr.income - prev.income) / Math.max(prev.income, 1) * 100).toFixed(1)}%`, up: curr.income >= prev.income },
    { title: "Despesas (Jun)", value: curr.expense, icon: TrendingDown, color: "#ef4444", bg: "rgba(239,68,68,0.12)", change: `${((curr.expense - prev.expense) / Math.max(prev.expense, 1) * 100).toFixed(1)}%`, up: curr.expense < prev.expense },
    { title: "Economia (Jun)", value: curr.balance, icon: PiggyBank, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", change: "+28,5%", up: true },
  ];

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  const monthKeys = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
  const monthlyData = months.map((m, i) => {
    const key = monthKeys[i];
    const inc = transactions.filter(t => t.date.startsWith(key) && t.type === "income").reduce((s, t) => s + t.amount, 0);
    const exp = transactions.filter(t => t.date.startsWith(key) && t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { name: m, receitas: inc || 7200 + i * 500, despesas: exp || 4800 + i * 300 };
  });

  const catSpend: Record<string, number> = {};
  transactions.filter(t => t.date.startsWith(currentMonth) && t.type === "expense").forEach(t => {
    catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
  });
  const pieData = Object.entries(catSpend).map(([id, value]) => {
    const cat = categories.find(c => c.id === id);
    return { name: cat?.name || id, value, color: cat?.color || "#8892b0" };
  }).sort((a, b) => b.value - a.value).slice(0, 6);

  const recentTxs = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  const tooltipStyle = {
    contentStyle: { background: "#141828", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#e8eeff" },
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-white" style={{ fontSize: "clamp(1.2rem, 4vw, 1.5rem)", fontWeight: 700 }}>
            Bem-vindo,! 👋
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
            Aqui está seu resumo financeiro de junho.
          </p>
        </div>
        <button
          onClick={() => setHideValues(!hideValues)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors shrink-0"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
        >
          {hideValues ? <Eye size={14} /> : <EyeOff size={14} />}
          <span className="hidden sm:inline">{hideValues ? "Mostrar" : "Ocultar"} valores</span>
        </button>
      </div>

      {/* Stat Cards — 1 col on xs, 2 on sm, 4 on xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl p-4 sm:p-5 relative overflow-hidden"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 -translate-y-8 translate-x-8"
                style={{ background: card.color }} />
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                  style={{ background: card.up ? "rgba(16,217,164,0.1)" : "rgba(239,68,68,0.1)", color: card.up ? "#10d9a4" : "#ef4444" }}>
                  {card.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {card.change}
                </span>
              </div>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>{card.title}</p>
              <p className="text-white mt-1" style={{ fontSize: "clamp(1.1rem, 3vw, 1.4rem)", fontWeight: 700 }}>
                {hideValues ? "••••••" : <AnimatedCounter value={card.value} />}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row — stacks on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Area chart — takes 2/3 on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="lg:col-span-2 rounded-2xl p-4 sm:p-5"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-white mb-0.5" style={{ fontWeight: 600 }}>Evolução Financeira</h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginBottom: "12px" }}>
            Receitas vs Despesas — 2026
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#204bca" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#204bca" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#8892b0", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8892b0", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} formatter={(val: number) => [formatCurrency(val), ""]} />
              <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#204bca" strokeWidth={2} fill="url(#incGrad)" dot={{ fill: "#204bca", r: 3, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#expGrad)" dot={{ fill: "#ef4444", r: 3, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
          className="rounded-2xl p-4 sm:p-5"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-white mb-0.5" style={{ fontWeight: 600 }}>Gastos por Categoria</h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginBottom: "8px" }}>Junho 2026</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={62}
                paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(val: number) => [formatCurrency(val), ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {pieData.slice(0, 4).map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{d.name}</span>
                </div>
                <span className="text-white" style={{ fontSize: "0.72rem", fontWeight: 500 }}>
                  {formatCurrency(d.value)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-2xl p-4 sm:p-5"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white" style={{ fontWeight: 600 }}>Últimas Transações</h3>
          <span style={{ color: "var(--primary)", fontSize: "0.8rem", cursor: "pointer" }}>Ver todas</span>
        </div>
        <div className="space-y-1">
          {recentTxs.map(tx => {
            const cat = categories.find(c => c.id === tx.category);
            return (
              <div key={tx.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--secondary)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: cat ? `${cat.color}20` : "var(--secondary)" }}>
                    <span style={{ fontSize: "13px" }}>{cat?.icon || "💳"}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white truncate" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                      {tx.description}
                    </p>
                    <p className="truncate" style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>
                      {cat?.name} · {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 ml-3"
                  style={{ color: tx.type === "income" ? "#10d9a4" : "#ef4444", fontWeight: 600, fontSize: "0.875rem", fontFamily: "var(--font-mono)" }}>
                  {tx.type === "income" ? "+" : "-"}{hideValues ? "••••" : formatCurrency(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
