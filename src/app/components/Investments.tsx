import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "motion/react";
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useFinance, formatCurrency, getTodayDateInput } from "../context/FinanceContext";
import type { Investment } from "../context/FinanceContext";
import { Modal } from "./shared/Modal";
import { ConfirmDeleteDialog } from "./shared/ConfirmDeleteDialog";

const TYPES = ["Renda Fixa", "Renda Variável", "FII", "Criptomoeda", "Previdência", "Outro"];
const TYPE_COLORS: Record<string, string> = {
  "Renda Fixa": "#10d9a4", "Renda Variável": "#204bca", "FII": "#8b5cf6",
  "Criptomoeda": "#f59e0b", "Previdência": "#ec4899", "Outro": "#94a3b8",
};

interface InvestFormProps {
  initial?: Investment;
  onAdd: (i: Omit<Investment, "id">) => Promise<void>;
  onUpdate: (i: Investment) => Promise<void>;
  onClose: () => void;
}

function InvestForm({ initial, onAdd, onUpdate, onClose }: InvestFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || "", type: initial?.type || "Renda Fixa",
    invested: initial?.invested?.toString() || "", currentValue: initial?.currentValue?.toString() || "",
    startDate: initial?.startDate || getTodayDateInput(), institution: initial?.institution || "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const invested = parseFloat(form.invested);
    const currentValue = parseFloat(form.currentValue);
    if (Number.isNaN(invested) || invested < 0) {
      toast.error("Informe um valor investido válido.");
      return;
    }
    if (Number.isNaN(currentValue) || currentValue < 0) {
      toast.error("Informe um valor atual válido.");
      return;
    }

    setSubmitting(true);
    try {
      const data = { ...form, invested, currentValue };
      if (initial) await onUpdate({ ...data, id: initial.id });
      else await onAdd(data);
      toast.success(initial ? "Investimento atualizado com sucesso!" : "Investimento adicionado com sucesso!");
      onClose();
    } catch (err) {
      console.error("Erro ao salvar investimento:", err);
    } finally {
      setSubmitting(false);
    }
  }

  const inp = { background: "var(--input-background)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--foreground)", padding: "10px 14px", width: "100%", fontSize: "0.875rem", outline: "none" };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Nome do ativo</label>
        <input style={inp} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: CDB Banco Inter" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Tipo</label>
          <select style={{ ...inp, cursor: "pointer" }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {TYPES.map(t => <option key={t} value={t} style={{ background: "#141828" }}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Instituição</label>
          <input style={inp} value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="Banco/Corretora" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Investido (R$)</label>
          <input style={inp} type="number" min="0" step="0.01" required value={form.invested} onChange={e => setForm(f => ({ ...f, invested: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Valor atual (R$)</label>
          <input style={inp} type="number" min="0" step="0.01" required value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Data de início</label>
        <input style={inp} type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>Cancelar</button>
        <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90"
          style={{ background: "var(--primary)", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Salvando..." : initial ? "Salvar" : "Adicionar"}</button>
      </div>
    </form>
  );
}

export function Investments() {
  const { investments, addInvestment, updateInvestment, deleteInvestment } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const totalInvested = investments.reduce((s, i) => s + i.invested, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalReturn = totalCurrent - totalInvested;
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const byType: Record<string, { invested: number; current: number }> = {};
  investments.forEach(inv => {
    if (!byType[inv.type]) byType[inv.type] = { invested: 0, current: 0 };
    byType[inv.type].invested += inv.invested;
    byType[inv.type].current += inv.currentValue;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-white" style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700 }}>Investimentos</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Acompanhe seu portfólio e rentabilidade</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 w-full sm:w-auto"
          style={{ background: "var(--primary)" }}>
          <Plus size={16} /> Novo Investimento
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {[
          { label: "Total Investido", value: formatCurrency(totalInvested), color: "#204bca", icon: "💼" },
          { label: "Valor Atual", value: formatCurrency(totalCurrent), color: "#e8eeff", icon: "📊" },
          { label: "Rentabilidade", value: `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`, color: returnPct >= 0 ? "#10d9a4" : "#ef4444", icon: returnPct >= 0 ? "📈" : "📉" },
          { label: "Lucro/Prejuízo", value: formatCurrency(totalReturn), color: totalReturn >= 0 ? "#10d9a4" : "#ef4444", icon: totalReturn >= 0 ? "✅" : "⚠️" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="rounded-2xl p-3 sm:p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span style={{ fontSize: "1rem" }}>{card.icon}</span>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{card.label}</p>
            </div>
            <p style={{ color: card.color, fontWeight: 700, fontSize: "clamp(0.85rem,2.5vw,1.05rem)", fontFamily: "var(--font-mono)" }}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* By type */}
      {Object.keys(byType).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-white mb-4" style={{ fontWeight: 600 }}>Por Tipo de Ativo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {Object.entries(byType).map(([type, data]) => {
              const ret = (data.invested > 0 ? (data.current - data.invested) / data.invested * 100 : 0).toFixed(2);
              const up = data.current >= data.invested;
              return (
                <div key={type} className="p-3 rounded-xl" style={{ background: "var(--secondary)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TYPE_COLORS[type] || "#94a3b8" }} />
                    <span className="text-white" style={{ fontSize: "0.78rem", fontWeight: 500 }}>{type}</span>
                  </div>
                  <p style={{ color: "var(--foreground)", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
                    {formatCurrency(data.current)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {up ? <TrendingUp size={11} style={{ color: "#10d9a4" }} /> : <TrendingDown size={11} style={{ color: "#ef4444" }} />}
                    <span style={{ fontSize: "0.7rem", color: up ? "#10d9a4" : "#ef4444", fontWeight: 600 }}>{ret}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Portfolio list — mobile cards + desktop table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
        className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="p-4 sm:p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-white" style={{ fontWeight: 600 }}>Portfólio</h3>
        </div>

        {investments.length === 0 ? (
          <div className="py-20 text-center" style={{ color: "var(--muted-foreground)" }}>
            <p style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📈</p>
            <p>Nenhum investimento registrado</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="block sm:hidden divide-y" style={{ borderColor: "var(--border)" }}>
              {investments.map((inv) => {
                const ret = inv.currentValue - inv.invested;
                const retPct = inv.invested > 0 ? (ret / inv.invested) * 100 : 0;
                const color = TYPE_COLORS[inv.type] || "#94a3b8";
                return (
                  <div key={inv.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                        <div>
                          <p className="text-white" style={{ fontWeight: 500, fontSize: "0.875rem" }}>{inv.name}</p>
                          <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{inv.type} · {inv.institution}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(inv)} className="p-1.5 rounded-lg" style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}><Edit2 size={13} /></button>
                        <button onClick={() => setDeleting(inv.id)} className="p-1.5 rounded-lg" style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p style={{ color: "var(--muted-foreground)", fontSize: "0.68rem" }}>Investido</p>
                        <p style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{formatCurrency(inv.invested)}</p>
                      </div>
                      <div>
                        <p style={{ color: "var(--muted-foreground)", fontSize: "0.68rem" }}>Atual</p>
                        <p className="text-white" style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.8rem" }}>{formatCurrency(inv.currentValue)}</p>
                      </div>
                      <div>
                        <p style={{ color: "var(--muted-foreground)", fontSize: "0.68rem" }}>Rentab.</p>
                        <div className="flex items-center gap-1">
                          {ret >= 0 ? <TrendingUp size={11} style={{ color: "#10d9a4" }} /> : <TrendingDown size={11} style={{ color: "#ef4444" }} />}
                          <span style={{ color: ret >= 0 ? "#10d9a4" : "#ef4444", fontWeight: 600, fontSize: "0.8rem" }}>
                            {retPct >= 0 ? "+" : ""}{retPct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "640px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Ativo", "Tipo", "Investido", "Atual", "Rentab.", "Ações"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv) => {
                    const ret = inv.currentValue - inv.invested;
                    const retPct = inv.invested > 0 ? (ret / inv.invested) * 100 : 0;
                    const color = TYPE_COLORS[inv.type] || "#94a3b8";
                    return (
                      <tr key={inv.id} className="hover:bg-[var(--secondary)]" style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <p className="text-white" style={{ fontWeight: 500, fontSize: "0.875rem" }}>{inv.name}</p>
                          <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{inv.institution}</p>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                            <span style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>{inv.type}</span>
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--muted-foreground)" }}>{formatCurrency(inv.invested)}</td>
                        <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.85rem" }} className="text-white">{formatCurrency(inv.currentValue)}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div className="flex items-center gap-1">
                            {ret >= 0 ? <TrendingUp size={12} style={{ color: "#10d9a4" }} /> : <TrendingDown size={12} style={{ color: "#ef4444" }} />}
                            <span style={{ color: ret >= 0 ? "#10d9a4" : "#ef4444", fontWeight: 600, fontSize: "0.85rem" }}>{retPct >= 0 ? "+" : ""}{retPct.toFixed(2)}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div className="flex gap-1.5">
                            <button onClick={() => setEditing(inv)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "var(--muted-foreground)" }}><Edit2 size={14} /></button>
                            <button onClick={() => setDeleting(inv.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: "var(--muted-foreground)" }}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Investimento" maxWidth={460}>
        <InvestForm onAdd={addInvestment} onUpdate={updateInvestment} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar Investimento" maxWidth={460}>
        {editing && (
          <InvestForm initial={editing} onAdd={addInvestment} onUpdate={updateInvestment} onClose={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDeleteDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteInvestment(deleting!)}
        title="Excluir investimento?"
        description="Esta ação não pode ser desfeita."
        successMessage="Investimento excluído com sucesso!"
        errorLog="Erro ao excluir investimento:"
      />
    </div>
  );
}
