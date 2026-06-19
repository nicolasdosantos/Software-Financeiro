import { motion } from "motion/react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useFinance, formatCurrency, getMonthName, getShortMonthName } from "../context/FinanceContext";
import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react";

export function Charts() {
  const { transactions, categories, currentMonth, setCurrentMonth } = useFinance();

  const safeTransactions = transactions ?? [];
  const selectedMonth = currentMonth;

  if (!safeTransactions.length) {
    return (
      <div style={{ color: "#fff", padding: 20 }}>
        Carregando dados...
      </div>
    );
  }

  function getMonthData(month: string) {
    const txs = safeTransactions.filter(t => t.date.startsWith(month));

    const income = txs
      .filter(t => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);

    const expense = txs
      .filter(t => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    return {
      income,
      expense,
      balance: income - expense
    };
  }

  // 📌 lista de meses
  const months = [
    ...new Set(
      safeTransactions
        .map(t => t.date?.slice(0, 7))
        .filter(Boolean)
    )
  ].sort();

  const monthNames = months.map(getShortMonthName);

  const prevMonthIndex = months.indexOf(selectedMonth) - 1;
  const prevMonth = months[prevMonthIndex] ?? selectedMonth;

  const curr = getMonthData(selectedMonth);
  const prevData = getMonthData(prevMonth);

  const barData = months.map((m, i) => {
    const d = getMonthData(m);
    return {
      name: monthNames[i],
      receitas: d.income,
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

  // 🟡 pizza categorias
  const catSpend: Record<string, number> = {};

  safeTransactions
    .filter(t => t.date.startsWith(selectedMonth) && t.type === "expense")
    .forEach(t => {
      catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
    });

  const pieData = Object.entries(catSpend).map(([id, value]) => {
    const cat = categories.find(c => c.id === id);

    return {
      name: cat?.name || id,
      value,
      color: cat?.color || "#8892b0",
      icon: cat?.icon || "💳"
    };
  }).sort((a, b) => b.value - a.value);

  const totalExpense = pieData.reduce((s, d) => s + d.value, 0);
  const topCategory = pieData[0];

  const savings =
    curr.income > 0
      ? ((curr.income - curr.expense) / curr.income * 100).toFixed(1)
      : "0";

  const tooltipStyle = {
    contentStyle: {
      background: "#141828",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "12px",
      color: "#e8eeff"
    },
    formatter: (val: number) => [formatCurrency(val), ""]
  };

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-white" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Gráficos & Relatórios
          </h1>
          <p style={{ color: "#8892b0", fontSize: "0.875rem" }}>
            Análise visual das suas finanças
          </p>
        </div>

        <select
          value={selectedMonth}
          onChange={e => setCurrentMonth(e.target.value)}
          style={{
            background: "#141828",
            border: "1px solid #2a2f45",
            borderRadius: "10px",
            color: "#fff",
            padding: "9px 12px"
          }}
        >
          {months.map(m => (
            <option key={m} value={m}>
              {getMonthName(m)}
            </option>
          ))}
        </select>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Receitas", value: curr.income, color: "#10d9a4", prev: prevData.income },
          { label: "Despesas", value: curr.expense, color: "#ef4444", prev: prevData.expense },
          { label: "Saldo", value: curr.balance, color: "#204bca", prev: prevData.balance }
        ].map((c, i) => {
          const change =
            c.prev ? ((c.value - c.prev) / c.prev * 100).toFixed(1) : "0";

          const up = c.value >= c.prev;

          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{
                background: "#141828",
                border: "1px solid #2a2f45",
                padding: 16,
                borderRadius: 12
              }}
            >
              <p style={{ color: "#8892b0", fontSize: 12 }}>{c.label}</p>
              <p style={{ color: "#fff", fontWeight: 700 }}>
                {formatCurrency(c.value)}
              </p>

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {up ? (
                  <TrendingUp size={14} color="#10d9a4" />
                ) : (
                  <TrendingDown size={14} color="#ef4444" />
                )}
                <span style={{ fontSize: 12, color: up ? "#10d9a4" : "#ef4444" }}>
                  {change}% vs mês anterior
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* BAR CHART */}
      <div style={{ background: "#141828", padding: 16, borderRadius: 12 }}>
        <h3 style={{ color: "#fff" }}>Receitas vs Despesas</h3>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData}>
            <CartesianGrid stroke="#2a2f45" />
            <XAxis dataKey="name" stroke="#8892b0" />
            <YAxis stroke="#8892b0" />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="receitas" fill="#7bc779" />
            <Bar dataKey="despesas" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* PIE CHART */}
      <div style={{ background: "#141828", padding: 16, borderRadius: 12 }}>
        <h3 style={{ color: "#fff" }}>Gastos por categoria</h3>

        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} dataKey="value" outerRadius={80}>
              {pieData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* LINE CHART */}
      <div style={{ background: "#141828", padding: 16, borderRadius: 12 }}>
        <h3 style={{ color: "#fff" }}>Evolução</h3>

        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={lineData}>
            <CartesianGrid stroke="#2a2f45" />
            <XAxis dataKey="name" stroke="#8892b0" />
            <YAxis stroke="#8892b0" />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="saldo" stroke="#204bca" />
            <Line type="monotone" dataKey="acumulado" stroke="#10d9a4" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* INSIGHTS */}
      <div style={{ background: "#141828", padding: 16, borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Lightbulb color="#f59e0b" />
          <h3 style={{ color: "#fff" }}>Insights</h3>
        </div>

        <p style={{ color: "#8892b0" }}>
          Taxa de poupança: {savings}%
        </p>

        <p style={{ color: "#8892b0" }}>
          Maior gasto: {topCategory?.name || "sem dados"}
        </p>
      </div>
    </div>
  );
}
