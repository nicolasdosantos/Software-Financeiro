import { useState } from "react";
import { motion } from "motion/react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  useFinance, formatCurrency, getMonthName, getMonthTotals, getShortMonthName, toLocalDate,
  getDistinctMonths, getAccumulatedBalance, sumExpensesByCategory,
} from "../context/FinanceContext";
import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { EmptyState } from "./shared/EmptyState";

// Antes eram hex fixos (#141828/#2a2f45/#8892b0) — ficavam corretos no tema
// escuro, mas essas constantes estilizam praticamente todos os painéis desta
// tela (cards de resumo, gráficos, insights), então um valor fixo faria a
// página inteira continuar escura mesmo com o tema claro ativo. Usando os
// tokens de tema, os painéis acompanham o tema como o resto do app.
const PANEL_BACKGROUND = "var(--card)";
const PANEL_BORDER = "var(--border)";
const PANEL_BORDER_STYLE = `1px solid ${PANEL_BORDER}`;
const MUTED_TEXT = "var(--muted-foreground)";

export function Charts() {
  const { transactions, categories, currentMonth, loading } = useFinance();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
  // Mês exibido aqui é independente do mês "oficial" usado em Dashboard/
  // Planejamento — trocar o mês só pra olhar um gráfico não deve mudar o que
  // aparece nas outras telas. Começa igual ao mês atual, mas vive só aqui.
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const safeTransactions = transactions ?? [];

  if (loading) {
    return (
      <div style={{ color: "var(--foreground)", padding: 20 }}>
        Carregando dados...
      </div>
    );
  }

  // 📌 lista de meses
  const months = getDistinctMonths(safeTransactions);

  const monthNames = months.map(getShortMonthName);

  const prevMonthIndex = months.indexOf(selectedMonth) - 1;
  const prevMonth = months[prevMonthIndex] ?? selectedMonth;

  const curr = getMonthTotals(safeTransactions, selectedMonth);
  const prevData = getMonthTotals(safeTransactions, prevMonth);

  const barData = months.map((m, i) => {
    const d = getMonthTotals(safeTransactions, m);
    return {
      name: monthNames[i],
      receitas: d.income,
      despesas: d.expense
    };
  });

  const lineData = months.map((m, i) => {
    const d = getMonthTotals(safeTransactions, m);

    return {
      name: monthNames[i],
      saldo: d.balance,
      acumulado: getAccumulatedBalance(safeTransactions, m)
    };
  });

  // 🟡 pizza categorias
  const catSpend = sumExpensesByCategory(safeTransactions, selectedMonth);

  const pieData = Object.entries(catSpend).map(([id, value]) => {
    const cat = categories.find(c => c.id === id);

    return {
      id,
      name: cat?.name || id,
      value,
      color: cat?.color || MUTED_TEXT,
      icon: cat?.icon || "💳"
    };
  }).sort((a, b) => b.value - a.value);

  const totalExpense = pieData.reduce((s, d) => s + d.value, 0);
  const topCategory = pieData[0];
  const activeCategoryId = selectedCategoryId ?? pieData[0]?.id ?? null;
  const activeCategory = pieData.find(item => item.id === activeCategoryId) ?? null;
  const activeCategoryTransactions = activeCategory
    ? safeTransactions
      .filter(t => t.date.startsWith(selectedMonth) && t.type === "expense" && t.category === activeCategory.id)
      .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const savings =
    curr.income > 0
      ? ((curr.income - curr.expense) / curr.income * 100).toFixed(1)
      : "0";

  const tooltipStyle = {
    contentStyle: {
      background: PANEL_BACKGROUND,
      border: PANEL_BORDER_STYLE,
      borderRadius: "12px",
      color: "var(--foreground)"
    },
    itemStyle: {
      color: "var(--foreground)"
    },
    labelStyle: {
      color: "var(--foreground)",
      fontWeight: 700
    },
    formatter: (val: number) => [formatCurrency(val), ""]
  };

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }}>
            Gráficos & Relatórios
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
            Análise visual das suas finanças
          </p>
        </div>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger
            className="w-[160px]"
            style={{ background: PANEL_BACKGROUND, borderColor: PANEL_BORDER, color: "var(--foreground)" }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m} value={m}>
                {getMonthName(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Receitas", value: curr.income, color: "var(--success)", prev: prevData.income },
          { label: "Despesas", value: curr.expense, color: "var(--red)", prev: prevData.expense },
          { label: "Saldo", value: curr.balance, color: "var(--primary)", prev: prevData.balance }
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
                background: PANEL_BACKGROUND,
                border: PANEL_BORDER_STYLE,
                padding: 16,
                borderRadius: 12
              }}
            >
              <p style={{ color: MUTED_TEXT, fontSize: 12 }}>{c.label}</p>
              <p style={{ color: "var(--foreground)", fontWeight: 700 }}>
                {formatCurrency(c.value)}
              </p>

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {up ? (
                  <TrendingUp size={14} color="var(--success)" />
                ) : (
                  <TrendingDown size={14} color="var(--red)" />
                )}
                <span style={{ fontSize: 12, color: up ? "var(--success)" : "var(--red)" }}>
                  {change}% vs mês anterior
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* BAR CHART */}
      <div style={{ background: PANEL_BACKGROUND, padding: 16, borderRadius: 12 }}>
        <h3 style={{ color: "var(--foreground)" }}>Receitas vs Despesas</h3>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData}>
            <CartesianGrid stroke={PANEL_BORDER} />
            <XAxis dataKey="name" stroke={MUTED_TEXT} />
            <YAxis stroke={MUTED_TEXT} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="receitas" fill="#7bc779" />
            <Bar dataKey="despesas" fill="var(--red)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* PIE CHART */}
      <div style={{ background: PANEL_BACKGROUND, padding: 16, borderRadius: 12 }}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-0">
            <h3 style={{ color: "var(--foreground)" }}>Gastos por categoria</h3>

            {pieData.length === 0 ? (
              <div className="flex items-center justify-center rounded-xl mt-3" style={{ height: 220, background: "var(--secondary)" }}>
                <EmptyState icon="🧾" title="Sem despesas neste mês" compact />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    outerRadius={86}
                    innerRadius={42}
                    paddingAngle={3}
                    onClick={(data) => setSelectedCategoryId(data.id)}
                    onMouseEnter={(data) => setHoveredCategoryId(data.id)}
                    onMouseLeave={() => setHoveredCategoryId(null)}
                  >
                    {pieData.map((d) => {
                      const active = d.id === activeCategoryId;
                      const hovered = d.id === hoveredCategoryId;
                      return (
                        <Cell
                          key={d.id}
                          fill={d.color}
                          stroke={active || hovered ? "var(--foreground)" : PANEL_BACKGROUND}
                          strokeWidth={active || hovered ? 3 : 1}
                          style={{ cursor: "pointer", filter: hovered ? "brightness(1.18)" : "none", outline: "none" }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {pieData.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {pieData.map(item => {
                  const active = item.id === activeCategoryId;
                  const hovered = item.id === hoveredCategoryId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(item.id)}
                      onMouseEnter={() => setHoveredCategoryId(item.id)}
                      onMouseLeave={() => setHoveredCategoryId(null)}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-colors"
                      style={{
                        background: active ? `${item.color}18` : "var(--secondary)",
                        border: `1px solid ${active ? item.color + "80" : "var(--border)"}`,
                      }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span>{item.icon}</span>
                        <span className="truncate" style={{ color: hovered || active ? item.color : "var(--foreground)", fontSize: "0.82rem", fontWeight: active ? 700 : 500 }}>
                          {item.name}
                        </span>
                      </span>
                      <span style={{ color: hovered || active ? item.color : "var(--muted-foreground)", fontSize: "0.78rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                        {totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(0) : 0}%
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <motion.div
            key={activeCategory?.id || "empty"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:w-[360px] rounded-xl p-4"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
          >
            {activeCategory ? (
              <>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "1.15rem" }}>{activeCategory.icon}</span>
                      <h4 className="truncate" style={{ fontWeight: 700, color: "var(--foreground)" }}>{activeCategory.name}</h4>
                    </div>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>{getMonthName(selectedMonth)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p style={{ color: activeCategory.color, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{formatCurrency(activeCategory.value)}</p>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{activeCategoryTransactions.length} gasto{activeCategoryTransactions.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>

                <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 260 }}>
                  {activeCategoryTransactions.map(tx => (
                    <div key={tx.id} className="rounded-lg px-3 py-2" style={{ background: PANEL_BACKGROUND, border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate" style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 600 }}>{tx.description}</p>
                        <span className="shrink-0" style={{ color: "var(--red)", fontWeight: 700, fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
                          -{formatCurrency(tx.amount)}
                        </span>
                      </div>
                      <p style={{ color: MUTED_TEXT, fontSize: "0.7rem" }}>
                        {toLocalDate(tx.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-center" style={{ color: "var(--muted-foreground)", minHeight: 220 }}>
                Sem categoria selecionada
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* LINE CHART */}
      <div style={{ background: PANEL_BACKGROUND, padding: 16, borderRadius: 12 }}>
        <h3 style={{ color: "var(--foreground)" }}>Evolução</h3>

        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={lineData}>
            <CartesianGrid stroke={PANEL_BORDER} />
            <XAxis dataKey="name" stroke={MUTED_TEXT} />
            <YAxis stroke={MUTED_TEXT} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="saldo" stroke="var(--primary)" />
            <Line type="monotone" dataKey="acumulado" stroke="var(--success)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* INSIGHTS */}
      <div style={{ background: PANEL_BACKGROUND, padding: 16, borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Lightbulb color="var(--warning)" />
          <h3 style={{ color: "var(--foreground)" }}>Insights</h3>
        </div>

        <p style={{ color: MUTED_TEXT }}>
          Taxa de poupança: {savings}%
        </p>

        <p style={{ color: MUTED_TEXT }}>
          Maior gasto: {topCategory?.name || "sem dados"}
        </p>
      </div>
    </div>
  );
}
