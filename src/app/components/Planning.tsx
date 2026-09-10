import { useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import { useFinance, formatCurrency, getMonthName, getCategorySpend } from "../context/FinanceContext";
import { Skeleton } from "./ui/skeleton";
import { Input } from "./ui/input";

function PlanningSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3.5 w-64" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-2xl p-3 sm:p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-3 w-full rounded-full" />
      </div>
      <div className="rounded-2xl p-4 sm:p-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <Skeleton className="h-4 w-40 mb-1" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="p-3 rounded-xl" style={{ background: "var(--secondary)" }}>
            <Skeleton className="h-3.5 w-28 mb-2" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Planning() {
  const { transactions, categories, budgets, updateBudget, currentMonth, loading } = useFinance();
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);

  if (loading) return <PlanningSkeleton />;

  function getSpend(catId: string) {
    return getCategorySpend(transactions, catId, currentMonth);
  }
  function getBudget(catId: string) { return budgets.find(b => b.categoryId === catId)?.limit || 0; }

  // Todas as categorias entram aqui — não só as que já têm gasto lançado ou
  // limite definido. Antes, uma categoria nova ficava invisível nesta tela até
  // o usuário gastar nela pela primeira vez, o que tornava impossível planejar
  // um limite com antecedência. getSpend() já retorna 0 pra categorias sem
  // despesa (inclusive as tipicamente usadas em receita, como Salário), então
  // isso não distorce os totais abaixo.
  const budgetCategories = categories;

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgetCategories.reduce((s, c) => s + getSpend(c.id), 0);
  const overBudget = budgetCategories.filter(c => { const l = getBudget(c.id); return l > 0 && getSpend(c.id) > l; }).length;
  const nearLimit = budgetCategories.filter(c => { const l = getBudget(c.id); const sp = getSpend(c.id); return l > 0 && sp >= l * 0.8 && sp <= l; }).length;

  async function saveLimit(catId: string) {
    if (savingLimit) return;
    const val = parseFloat(newLimit);
    if (isNaN(val) || val < 0) {
      toast.error("Informe um valor de limite válido.");
      return;
    }

    setSavingLimit(true);
    try {
      await updateBudget({ categoryId: catId, limit: val });
      toast.success("Limite de orçamento atualizado com sucesso!");
      setEditingCat(null);
      setNewLimit("");
    } catch (err) {
      console.error("Erro ao salvar limite de orçamento:", err);
    } finally {
      setSavingLimit(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-white" style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700 }}>Planejamento Financeiro</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>{getMonthName(currentMonth)} — Controle seu orçamento por categoria</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {[
          { label: "Orçamento Total", value: formatCurrency(totalLimit), icon: "💰", color: "var(--primary)" },
          { label: "Total Gasto", value: formatCurrency(totalSpent), icon: "📊", color: totalSpent > totalLimit ? "var(--red)" : "var(--success)" },
          { label: "Disponível", value: formatCurrency(Math.max(0, totalLimit - totalSpent)), icon: "✅", color: "var(--success)" },
          { label: "Alertas", value: `${overBudget} acima · ${nearLimit} perto`, icon: "⚠️", color: "var(--warning)" },
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
            style={{ background: totalSpent > totalLimit ? "var(--red)" : totalSpent > totalLimit * 0.8 ? "var(--warning)" : "linear-gradient(90deg, var(--primary), rgba(var(--primary-rgb),0.55))" }} />
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
          {budgetCategories.map(cat => {
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
                    {over && <AlertTriangle size={13} style={{ color: "var(--red)" }} />}
                    {near && !over && <AlertTriangle size={13} style={{ color: "var(--warning)" }} />}
                    {limit > 0 && !over && !near && <CheckCircle size={13} style={{ color: "var(--success)" }} />}
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input autoFocus type="number" value={newLimit} onChange={e => setNewLimit(e.target.value)}
                        placeholder="Limite R$" className="w-[110px] h-8 text-sm"
                        onKeyDown={e => { if (e.key === "Enter") saveLimit(cat.id); if (e.key === "Escape") setEditingCat(null); }} />
                      <button onClick={() => saveLimit(cat.id)} disabled={savingLimit} aria-label={`Salvar limite de "${cat.name}"`} style={{ color: "var(--success)", opacity: savingLimit ? 0.6 : 1 }}><CheckCircle size={16} /></button>
                      <button onClick={() => setEditingCat(null)} disabled={savingLimit} aria-label="Cancelar edição do limite" style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingCat(cat.id); setNewLimit(limit.toString()); }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors hover:text-[var(--foreground)]"
                      style={{ color: "var(--muted-foreground)" }}>
                      <Edit2 size={11} />{limit > 0 ? formatCurrency(limit) : "Definir limite"}
                    </button>
                  )}
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  {limit > 0 && (
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                      className="h-full rounded-full" style={{ background: over ? "var(--red)" : near ? "var(--warning)" : cat.color }} />
                  )}
                </div>
                <div className="flex justify-between mt-1.5">
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>Gasto: {formatCurrency(spend)}</span>
                  {limit > 0 && (
                    <span style={{ fontSize: "0.72rem", fontWeight: 500, color: over ? "var(--red)" : near ? "var(--warning)" : "var(--success)" }}>
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
