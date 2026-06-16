import { useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle, Edit2, X } from "lucide-react";
import { useFinance, formatCurrency } from "../context/FinanceContext";

export function Planning() {
  const { transactions, categories, budgets, updateBudget } = useFinance();
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState("");
  const currentMonth = "2026-06";

  function getSpend(catId: string) {
    return transactions.filter(t => t.date.startsWith(currentMonth) && t.category === catId && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
  }
  function getBudget(catId: string) { return budgets.find(b => b.categoryId === catId)?.limit || 0; }

  const expenseCategories = categories.filter(c =>
    transactions.some(t => t.category === c.id && t.type === "expense") || budgets.some(b => b.categoryId === c.id)
  );

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = expenseCategories.reduce((s, c) => s + getSpend(c.id), 0);
  const overBudget = expenseCategories.filter(c => { const l = getBudget(c.id); return l > 0 && getSpend(c.id) > l; }).length;
  const nearLimit = expenseCategories.filter(c => { const l = getBudget(c.id); const sp = getSpend(c.id); return l > 0 && sp >= l * 0.8 && sp <= l; }).length;

  function saveLimit(catId: string) {
    const val = parseFloat(newLimit);
    if (!isNaN(val) && val >= 0) updateBudget({ categoryId: catId, limit: val });
    setEditingCat(null); setNewLimit("");
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-white" style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700 }}>Planejamento Financeiro</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Junho 2026 — Controle seu orçamento por categoria</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {[
          { label: "Orçamento Total", value: formatCurrency(totalLimit), icon: "💰", color: "#204bca" },
          { label: "Total Gasto", value: formatCurrency(totalSpent), icon: "📊", color: totalSpent > totalLimit ? "#ef4444" : "#10d9a4" },
          { label: "Disponível", value: formatCurrency(Math.max(0, totalLimit - totalSpent)), icon: "✅", color: "#10d9a4" },
          { label: "Alertas", value: `${overBudget} acima · ${nearLimit} perto`, icon: "⚠️", color: "#f59e0b" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="rounded-2xl p-3 sm:p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span style={{ fontSize: "1.1rem" }}>{card.icon}</span>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{card.label}</p>
            </div>
            <p style={{ color: card.color, fontWeight: 700, fontSize: "clamp(0.85rem,2.5vw,1.05rem)", fontFamily: "var(--font-mono)" }}>
              {card.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Global progress */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white" style={{ fontWeight: 600 }}>Orçamento Global</h3>
          <span style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
            {formatCurrency(totalSpent)} / {formatCurrency(totalLimit)}
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0}%` }}
            transition={{ duration: 1, ease: "easeOut" }} className="h-full rounded-full"
            style={{ background: totalSpent > totalLimit ? "#ef4444" : totalSpent > totalLimit * 0.8 ? "#f59e0b" : "linear-gradient(90deg, #204bca, #7b9cff)" }} />
        </div>
        <div className="flex justify-between mt-2">
          <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
            {totalLimit > 0 ? ((totalSpent / totalLimit) * 100).toFixed(0) : 0}% utilizado
          </span>
          <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Restam {formatCurrency(Math.max(0, totalLimit - totalSpent))}</span>
        </div>
      </motion.div>

      {/* Per category */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
        className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-white mb-4" style={{ fontWeight: 600 }}>Limite por Categoria</h3>
        <div className="space-y-3">
          {expenseCategories.map(cat => {
            const spend = getSpend(cat.id);
            const limit = getBudget(cat.id);
            const pct = limit > 0 ? Math.min(100, (spend / limit) * 100) : 0;
            const over = limit > 0 && spend > limit;
            const near = limit > 0 && spend >= limit * 0.8 && spend <= limit;
            const isEditing = editingCat === cat.id;

            return (
              <div key={cat.id} className="p-3 rounded-xl" style={{ background: "var(--secondary)" }}>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "15px" }}>{cat.icon}</span>
                    <span className="text-white" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{cat.name}</span>
                    {over && <AlertTriangle size={13} style={{ color: "#ef4444" }} />}
                    {near && !over && <AlertTriangle size={13} style={{ color: "#f59e0b" }} />}
                    {limit > 0 && !over && !near && <CheckCircle size={13} style={{ color: "#10d9a4" }} />}
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input autoFocus type="number" value={newLimit} onChange={e => setNewLimit(e.target.value)}
                        placeholder="Limite R$"
                        style={{ background: "var(--input-background)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)", padding: "4px 10px", fontSize: "0.8rem", outline: "none", width: "110px" }}
                        onKeyDown={e => { if (e.key === "Enter") saveLimit(cat.id); if (e.key === "Escape") setEditingCat(null); }} />
                      <button onClick={() => saveLimit(cat.id)} style={{ color: "#10d9a4" }}><CheckCircle size={16} /></button>
                      <button onClick={() => setEditingCat(null)} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingCat(cat.id); setNewLimit(limit.toString()); }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--foreground)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}>
                      <Edit2 size={11} />{limit > 0 ? formatCurrency(limit) : "Definir limite"}
                    </button>
                  )}
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  {limit > 0 && (
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                      className="h-full rounded-full" style={{ background: over ? "#ef4444" : near ? "#f59e0b" : cat.color }} />
                  )}
                </div>
                <div className="flex justify-between mt-1.5">
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>Gasto: {formatCurrency(spend)}</span>
                  {limit > 0 && (
                    <span style={{ fontSize: "0.72rem", fontWeight: 500, color: over ? "#ef4444" : near ? "#f59e0b" : "#10d9a4" }}>
                      {over ? `Excedeu em ${formatCurrency(spend - limit)}` : `Restam ${formatCurrency(limit - spend)}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Tips */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}
        className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-white mb-3" style={{ fontWeight: 600 }}>Dicas Financeiras</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: "💡", tip: "Regra 50/30/20", desc: "50% necessidades, 30% desejos, 20% poupança." },
            { icon: "📅", tip: "Revise mensalmente", desc: "Ajuste seus limites conforme os gastos reais evoluem." },
            { icon: "🎯", tip: "Categorias realistas", desc: "Defina limites baseados no histórico dos últimos 3 meses." },
          ].map(t => (
            <div key={t.tip} className="p-3 rounded-xl" style={{ background: "var(--secondary)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: "1rem" }}>{t.icon}</span>
                <span style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.82rem" }}>{t.tip}</span>
              </div>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
