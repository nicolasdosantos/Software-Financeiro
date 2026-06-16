import { useState } from "react";
import { motion } from "motion/react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useFinance, formatCurrency } from "../context/FinanceContext";
import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react";

export function Charts() {
  const { transactions, categories } = useFinance();
  const [selectedMonth, setSelectedMonth] = useState("2026-06");

  const months = [
    ...new Set(
      transactions
        .map(t => t.date.slice(0, 7))
        .sort()
    )
  ];
  const monthNames = months.map(month =>
    new Date(month + "-01").toLocaleString("pt-BR", {
      month: "short"
    })
  );
  function getMonthData(month: string) {
    const txs = transactions.filter(t => t.date.startsWith(month));
    const income = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }

  const barData = months.map((m, i) => {
    const d = getMonthData(m);
    return {
      name: monthNames[i], receitas: d.income,
      despesas: d.expense
    };
  });


  let acumulado = 0;

  const lineData = months.map((m, i) => {
    const d = getMonthData(m);

    acumulado += d.balance;

    return {
      name: monthNames[i],
      saldo: d.balance,
      acumulado
    };
  });

  const catSpend: Record<string, number> = {};
  transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === "expense").forEach(t => {
    catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
  });
  const pieData = Object.entries(catSpend).map(([id, value]) => {
    const cat = categories.find(c => c.id === id);
    return { name: cat?.name || id, value, color: cat?.color || "#8892b0", icon: cat?.icon || "💳" };
  }).sort((a, b) => b.value - a.value);

  const totalExpense = pieData.reduce((s, d) => s + d.value, 0);
  const curr = getMonthData(selectedMonth);
  const prev = getMonthData("2026-05");
  const topCategory = pieData[0];
  const savings = curr.income > 0 ? ((curr.income - curr.expense) / curr.income * 100).toFixed(1) : "0";

  const tooltipStyle = {
    contentStyle: { background: "#141828", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#e8eeff" },
    formatter: (val: number) => [formatCurrency(val), ""],
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-white" style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700 }}>Gráficos & Relatórios</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Análise visual completa das suas finanças</p>
        </div>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          style={{ background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--foreground)", padding: "9px 12px", fontSize: "0.875rem", outline: "none", cursor: "pointer" }}>
          {months.map(m => (
            <option key={m} value={m} style={{ background: "#141828" }}>
              {new Date(m + "-01").toLocaleString("pt-BR", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Receitas", value: curr.income, color: "#10d9a4", prev: prev.income },
          { label: "Despesas", value: curr.expense, color: "#ef4444", prev: prev.expense },
          { label: "Saldo", value: curr.balance, color: "#204bca", prev: prev.balance },
        ].map((c, i) => {
          const change = c.prev ? ((c.value - c.prev) / c.prev * 100).toFixed(1) : "0";
          const up = c.value >= c.prev;
          return (
            <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>{c.label}</p>
              <p className="text-white mt-1 mb-2" style={{ fontSize: "clamp(1rem,3vw,1.25rem)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                {formatCurrency(c.value)}
              </p>
              <div className="flex items-center gap-1.5">
                {up ? <TrendingUp size={13} style={{ color: "#10d9a4" }} /> : <TrendingDown size={13} style={{ color: "#ef4444" }} />}
                <span style={{ fontSize: "0.75rem", color: up ? "#10d9a4" : "#ef4444", fontWeight: 500 }}>{change}% vs mês anterior</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bar + Pie — stacks on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-white mb-1" style={{ fontWeight: 600 }}>Comparativo Mensal</h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginBottom: "16px" }}>Receitas vs Despesas por mês</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#8892b0", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8892b0", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="receitas" name="Receitas" fill="#204bca" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-white mb-1" style={{ fontWeight: 600 }}>Gastos por Categoria</h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginBottom: "8px" }}>
            Total: {formatCurrency(totalExpense)}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="shrink-0">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full space-y-2">
              {pieData.slice(0, 5).map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{d.icon} {d.name}</span>
                  </div>
                  <span style={{ color: "var(--foreground)", fontSize: "0.75rem", fontWeight: 500 }}>
                    {totalExpense > 0 ? ((d.value / totalExpense) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Line chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
        className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-white mb-1" style={{ fontWeight: 600 }}>Evolução Patrimonial</h3>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginBottom: "16px" }}>Saldo mensal e patrimônio acumulado</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: "#8892b0", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8892b0", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ color: "#8892b0", fontSize: "12px" }} />
            <Line type="monotone" dataKey="saldo" name="Saldo Mensal" stroke="#204bca" strokeWidth={2.5} dot={{ fill: "#204bca", r: 3, strokeWidth: 0 }} />
            <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#10d9a4" strokeWidth={2.5} dot={{ fill: "#10d9a4", r: 3, strokeWidth: 0 }} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Insights */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
        className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={18} style={{ color: "#f59e0b" }} />
          <h3 className="text-white" style={{ fontWeight: 600 }}>Insights Automáticos</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: "💰", title: "Taxa de Poupança", desc: `Você economizou ${savings}% da sua renda. Meta: 20%.`, color: parseFloat(savings) >= 20 ? "#10d9a4" : "#f59e0b" },
            { icon: "📊", title: "Maior Gasto", desc: topCategory ? `${topCategory.icon} ${topCategory.name}: ${formatCurrency(topCategory.value)}` : "Sem dados.", color: "#204bca" },
            { icon: curr.balance >= 0 ? "✅" : "⚠️", title: curr.balance >= 0 ? "Mês positivo" : "Atenção!", desc: curr.balance >= 0 ? `Saldo de ${formatCurrency(curr.balance)}.` : `Excedeu em ${formatCurrency(Math.abs(curr.balance))}.`, color: curr.balance >= 0 ? "#10d9a4" : "#ef4444" },
          ].map((ins, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ background: "var(--secondary)" }}>
              <span style={{ fontSize: "1.4rem", lineHeight: 1.2 }}>{ins.icon}</span>
              <div>
                <p style={{ color: ins.color, fontWeight: 600, fontSize: "0.85rem", marginBottom: "2px" }}>{ins.title}</p>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>{ins.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
