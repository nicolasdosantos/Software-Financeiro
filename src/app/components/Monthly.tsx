import { useState } from "react";
import { motion } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFinance, formatCurrency, getMonthName } from "../context/FinanceContext";

export function Monthly() {
  const { transactions, categories } = useFinance();
  const [currentMonth, setCurrentMonth] = useState("2026-06");

  const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
  const currIdx = months.indexOf(currentMonth);
  function navigate(dir: -1 | 1) {
    const next = currIdx + dir;
    if (next >= 0 && next < months.length) setCurrentMonth(months[next]);
  }

  const txs = transactions.filter(t => t.date.startsWith(currentMonth));
  const income = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const [year, month] = currentMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  function getDayTxs(day: number) {
    const d = `${currentMonth}-${String(day).padStart(2, "0")}`;
    return transactions.filter(t => t.date === d);
  }

  const catSpend: { cat: any; total: number }[] = [];
  categories.forEach(cat => {
    const total = txs.filter(t => t.category === cat.id && t.type === "expense").reduce((s, t) => s + t.amount, 0);
    if (total > 0) catSpend.push({ cat, total });
  });
  catSpend.sort((a, b) => b.total - a.total);

  const compData = months.map((m, i) => {
    const mt = transactions.filter(t => t.date.startsWith(m));
    const inc = mt.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const exp = mt.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return {
      name: new Date(m + "-01").toLocaleString("pt-BR", { month: "short" }),
      saldo: inc - exp || (i < 4 ? 2500 + i * 400 : 0),
    };
  });

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-white" style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700 }}>Controle Mensal</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Visualize suas finanças mês a mês</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={() => navigate(-1)} disabled={currIdx === 0}
            className="p-2 rounded-xl disabled:opacity-30 transition-colors"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-white text-sm font-semibold whitespace-nowrap px-1"
            style={{ minWidth: "140px", textAlign: "center" }}>
            {getMonthName(currentMonth)}
          </span>
          <button onClick={() => navigate(1)} disabled={currIdx === months.length - 1}
            className="p-2 rounded-xl disabled:opacity-30 transition-colors"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: "Receitas", value: income, color: "#10d9a4" },
          { label: "Despesas", value: expense, color: "#ef4444" },
          { label: "Saldo", value: balance, color: balance >= 0 ? "#204bca" : "#ef4444" },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="rounded-2xl p-3 sm:p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{item.label}</p>
            <p className="mt-1 font-bold" style={{ fontSize: "clamp(0.85rem,2.5vw,1.2rem)", fontFamily: "var(--font-mono)", color: item.color }}>
              {formatCurrency(item.value)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Calendar + Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Calendar — takes 2 cols on desktop */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-white mb-4" style={{ fontWeight: 600 }}>Calendário Financeiro</h3>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center py-1" style={{ color: "var(--muted-foreground)", fontSize: "0.65rem" }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayTxs = getDayTxs(day);
              const net = dayTxs.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
              const hasActivity = dayTxs.length > 0;
              const today = `${currentMonth}-${String(day).padStart(2, "0")}` === "2026-06-12";
              return (
                <div key={day} className="aspect-square flex flex-col items-center justify-center rounded-lg sm:rounded-xl cursor-default"
                  style={{
                    background: today ? "var(--primary)" : hasActivity ? `${net >= 0 ? "#10d9a4" : "#ef4444"}15` : "transparent",
                    color: today ? "#fff" : hasActivity ? (net >= 0 ? "#10d9a4" : "#ef4444") : "var(--muted-foreground)",
                    border: today ? "none" : hasActivity ? `1px solid ${net >= 0 ? "#10d9a450" : "#ef444450"}` : "1px solid transparent",
                  }}>
                  <span style={{ fontWeight: today || hasActivity ? 600 : 400, fontSize: "clamp(0.65rem,1.5vw,0.82rem)" }}>{day}</span>
                  {hasActivity && <span style={{ fontSize: "0.5rem", fontWeight: 600 }}>{dayTxs.length}tx</span>}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Category breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-white mb-4" style={{ fontWeight: 600 }}>Por Categoria</h3>
          {catSpend.length === 0 ? (
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Sem despesas neste mês</p>
          ) : (
            <div className="space-y-3 overflow-y-auto" style={{ maxHeight: "280px" }}>
              {catSpend.map(({ cat, total }) => (
                <div key={cat.id}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "13px" }}>{cat.icon}</span>
                      <span style={{ color: "var(--foreground)", fontSize: "0.8rem" }}>{cat.name}</span>
                    </div>
                    <span style={{ color: cat.color, fontSize: "0.78rem", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${expense > 0 ? (total / expense) * 100 : 0}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full" style={{ background: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Monthly comparison bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
        className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-white mb-1" style={{ fontWeight: 600 }}>Evolução do Saldo</h3>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginBottom: "16px" }}>Saldo mês a mês em 2026</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={compData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#8892b0", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8892b0", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "#141828", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#e8eeff" }}
              formatter={(v: number) => [formatCurrency(v), "Saldo"]} />
            <Bar dataKey="saldo" name="Saldo" radius={[6, 6, 0, 0]} fill="#204bca" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Transaction list */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
        className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-white mb-4" style={{ fontWeight: 600 }}>Transações do Mês</h3>
        {txs.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", textAlign: "center", padding: "24px 0" }}>Nenhuma transação neste mês</p>
        ) : (
          <div className="space-y-1">
            {txs.sort((a, b) => b.date.localeCompare(a.date)).map(tx => {
              const cat = categories.find(c => c.id === tx.category);
              return (
                <div key={tx.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--secondary)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cat ? `${cat.color}20` : "var(--secondary)" }}>
                      <span style={{ fontSize: "13px" }}>{cat?.icon || "💳"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white truncate" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{tx.description}</p>
                      <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>
                        {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 ml-2" style={{ color: tx.type === "income" ? "#10d9a4" : "#ef4444", fontWeight: 600, fontSize: "0.875rem", fontFamily: "var(--font-mono)" }}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
