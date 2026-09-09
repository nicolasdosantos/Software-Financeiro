import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  AreaChart, Area, PieChart, Pie, Cell, Sector,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, Eye, EyeOff, Sparkles } from "lucide-react";
import {
  useFinance, formatCurrency, getMonthName, getMonthTotals, getShortMonthName, toLocalDate,
  getDistinctMonths, getAccumulatedBalance, sumExpensesByCategory,
} from "../context/FinanceContext";
import { useUser } from "../../hooks/useUser";
import { useNavigate } from "react-router-dom";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { EmptyState } from "./shared/EmptyState";

function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="w-10 h-10 rounded-xl mb-4" />
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-2 rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-40 mb-1" />
          <Skeleton className="h-3 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>
        <div className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="flex justify-center mb-4">
            <Skeleton className="w-[170px] h-[170px] rounded-full" />
          </div>
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-4 w-full mb-2" />)}
        </div>
      </div>
      <div className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <Skeleton className="h-4 w-40 mb-4" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function renderActivePieShape(props: PieSectorDataItem) {
  const { cx = 0, cy = 0, innerRadius = 0, outerRadius = 0, startAngle = 0, endAngle = 0, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 9} outerRadius={outerRadius + 11}
        startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.35} />
    </g>
  );
}


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
  const [hideValues, setHideValues] = useState(false);
  const [activePieIndex, setActivePieIndex] = useState(-1);

  const { transactions, categories, currentMonth, loading } = useFinance();

  const user = useUser();

  const months = getDistinctMonths(transactions);

  const pieMonths = getDistinctMonths(transactions, [currentMonth]);
  const [pieMonth, setPieMonth] = useState(currentMonth);

  const prevMonthIndex = months.indexOf(currentMonth) - 1;
  const prevMonth = months[prevMonthIndex] ?? currentMonth;

  const curr = getMonthTotals(transactions, currentMonth);
  const prev = getMonthTotals(transactions, prevMonth);
  const savings = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
    - transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const savingsCurrMonth = getAccumulatedBalance(transactions, currentMonth);
  const savingsPrevMonth = getAccumulatedBalance(transactions, prevMonth);
  const savingsChange = ((savingsCurrMonth - savingsPrevMonth) / Math.max(Math.abs(savingsPrevMonth), 1)) * 100;
  const balanceChange = ((curr.balance - prev.balance) / Math.max(Math.abs(prev.balance), 1)) * 100;

  const statCards = [
    { title: "Saldo Total", value: savings, icon: Wallet, color: "var(--primary)", bg: "rgba(var(--primary-rgb),0.12)", change: `${savingsChange >= 0 ? "+" : ""}${savingsChange.toFixed(1)}%`, up: savingsCurrMonth >= savingsPrevMonth },
    { title: `Receitas (${getShortMonthName(currentMonth)})`, value: curr.income, icon: TrendingUp, color: "var(--success)", bg: "rgba(16,217,164,0.12)", change: `${((curr.income - prev.income) / Math.max(prev.income, 1) * 100).toFixed(1)}%`, up: curr.income >= prev.income },
    { title: `Despesas (${getShortMonthName(currentMonth)})`, value: curr.expense, icon: TrendingDown, color: "var(--red)", bg: "rgba(239,68,68,0.12)", change: `${((curr.expense - prev.expense) / Math.max(prev.expense, 1) * 100).toFixed(1)}%`, up: curr.expense < prev.expense },
    { title: `Economia (${getShortMonthName(currentMonth)})`, value: curr.balance, icon: PiggyBank, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", change: `${balanceChange >= 0 ? "+" : ""}${balanceChange.toFixed(1)}%`, up: curr.balance >= prev.balance },
  ];

  const dataYears = [...new Set(months.map(m => m.slice(0, 4)))];
  const dataYearLabel = dataYears.length === 0
    ? String(new Date().getFullYear())
    : dataYears.length === 1
      ? dataYears[0]
      : `${dataYears[0]}–${dataYears[dataYears.length - 1]}`;

  const monthlyData = months.map((m) => {
    const inc = transactions
      .filter(t => t.date?.startsWith(m) && t.type === "income")
      .reduce((s, t) => s + t.amount, 0);

    const exp = transactions
      .filter(t => t.date?.startsWith(m) && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    return {
      name: getShortMonthName(m),
      receitas: inc,
      despesas: exp,
    };
  });

  const catSpend = sumExpensesByCategory(transactions, pieMonth);
  const pieData = Object.entries(catSpend).map(([id, value]) => {
    const cat = categories.find(c => c.id === id);
    return { name: cat?.name || id, value, color: cat?.color || "#8892b0" };
  }).sort((a, b) => b.value - a.value).slice(0, 6);
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
  const activePieSlice = activePieIndex >= 0 ? pieData[activePieIndex] : null;

  const recentTxs = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  const tooltipStyle = {
    contentStyle: { background: "#141828", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#ffffff" },
    itemStyle: { color: "#ffffff" },
    labelStyle: { color: "#ffffff" },
  };

  const navigate = useNavigate();

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(var(--primary-rgb),0.25), rgba(139,92,246,0.2))" }}
          >
            <Sparkles size={18} style={{ color: "#8b9cff" }} />
          </motion.div>
          <div className="min-w-0">
            <h1 className="text-white truncate" style={{ fontSize: "clamp(1.2rem, 4vw, 1.5rem)", fontWeight: 700 }}>
              Bem-vindo, {user?.user_metadata?.name || "Usuário"}! 👋
            </h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
              Aqui está seu resumo financeiro de {getMonthName(currentMonth)}.
            </p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
          onClick={() => setHideValues(!hideValues)}
          aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm shrink-0"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
        >
          {hideValues ? <Eye size={14} /> : <EyeOff size={14} />}
          <span className="hidden sm:inline">{hideValues ? "Mostrar" : "Ocultar"} valores</span>
        </motion.button>
      </motion.div>

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
                <motion.div whileHover={{ scale: 1.08 }} transition={{ type: "spring", stiffness: 350, damping: 15 }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                  <Icon size={18} style={{ color: card.color }} />
                </motion.div>
                <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                  style={{ background: card.up ? "rgba(16,217,164,0.1)" : "rgba(239,68,68,0.1)", color: card.up ? "var(--success)" : "var(--red)" }}>
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
            Receitas vs Despesas — {dataYearLabel}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7bc779" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#7bc779" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--red)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--red)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#8892b0", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8892b0", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} formatter={(val: number) => [formatCurrency(val), ""]} />
              <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#45a342" strokeWidth={2} fill="url(#incGrad)" dot={{ fill: "#6ac067", r: 3, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="despesas" name="Despesas" stroke="var(--red)" strokeWidth={2} fill="url(#expGrad)" dot={{ fill: "var(--red)", r: 3, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
          className="rounded-2xl p-4 sm:p-5"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div>
              <h3 className="text-white" style={{ fontWeight: 600 }}>Gastos por Categoria</h3>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>{getMonthName(pieMonth)}</p>
            </div>
            <Select value={pieMonth} onValueChange={setPieMonth}>
              <SelectTrigger size="sm" className="w-[118px] shrink-0" style={{ background: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pieMonths.map(m => (
                  <SelectItem key={m} value={m}>{getShortMonthName(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {pieData.length === 0 ? (
            <div className="flex items-center justify-center" style={{ height: 140 }}>
              <EmptyState icon="🧾" title={`Sem despesas em ${getMonthName(pieMonth)}`} compact />
            </div>
          ) : (
            <div className="relative" style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    key={pieMonth}
                    data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                    paddingAngle={3} dataKey="value" style={{ color: "white" }}
                    activeIndex={activePieIndex} activeShape={renderActivePieShape}
                    onMouseEnter={(_, i) => setActivePieIndex(i)}
                    onMouseLeave={() => setActivePieIndex(-1)}
                    isAnimationActive animationBegin={0} animationDuration={650} animationEasing="ease-out"
                  >
                    {pieData.map((entry, i) => (
                      <Cell
                        key={i} fill={entry.color}
                        style={{ cursor: "pointer", filter: activePieIndex === i ? "brightness(1.15)" : undefined, transition: "filter 0.2s ease" }}
                      />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(val: number, name: string) => [`${formatCurrency(val)} (${((val / pieTotal) * 100).toFixed(0)}%)`, name]} />
                </PieChart>
              </ResponsiveContainer>
              {!activePieSlice && (
                <motion.div
                  key="total"
                  initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                >
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.68rem" }}>Total gasto</span>
                  <span className="text-white" style={{ fontSize: "1rem", fontWeight: 700 }}>
                    {formatCurrency(pieTotal)}
                  </span>
                </motion.div>
              )}
            </div>
          )}

          <div className="space-y-1.5 mt-1">
            {pieData.map((d, i) => (
              <div
                key={d.name}
                className="flex items-center justify-between rounded-lg px-1.5 py-1 -mx-1.5 transition-colors cursor-pointer"
                style={{ background: activePieIndex === i ? "var(--secondary)" : "transparent" }}
                onMouseEnter={() => setActivePieIndex(i)}
                onMouseLeave={() => setActivePieIndex(-1)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="truncate" style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{d.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.68rem" }}>
                    {pieTotal ? ((d.value / pieTotal) * 100).toFixed(0) : 0}%
                  </span>
                  <span className="text-white" style={{ fontSize: "0.72rem", fontWeight: 500 }}>
                    {formatCurrency(d.value)}
                  </span>
                </div>
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
          <button
            type="button"
            onClick={() => navigate("/transacoes")}
            className="hover:underline"
            style={{ color: "var(--primary)", fontSize: "0.8rem", cursor: "pointer", background: "none", border: "none", padding: 0 }}
          >
            Ver todas
          </button>
        </div>
        <div className="space-y-1">
          {recentTxs.map((tx, i) => {
            const cat = categories.find(c => c.id === tx.category);
            return (
              <motion.div key={tx.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + Math.min(i * 0.05, 0.3), duration: 0.3 }}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors hover:bg-[var(--secondary)]">
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
                      {cat?.name} · {toLocalDate(tx.date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 ml-3"
                  style={{ color: tx.type === "income" ? "var(--success)" : "var(--red)", fontWeight: 600, fontSize: "0.875rem", fontFamily: "var(--font-mono)" }}>
                  {tx.type === "income" ? "+" : "-"}{hideValues ? "••••" : formatCurrency(tx.amount)}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
