import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Edit2, Trash2, X, ChevronDown } from "lucide-react";
import { useFinance, formatCurrency, Transaction } from "../context/FinanceContext";

const ITEMS_PER_PAGE = 8;

function TransactionForm({ initial, onSave, onClose }: { initial?: Transaction; onSave: (t: any) => void; onClose: () => void }) {
  const { categories } = useFinance();
  const [form, setForm] = useState({
    type: initial?.type || "expense" as "income" | "expense",
    amount: initial?.amount?.toString() || "",
    description: initial?.description || "",
    category: initial?.category || categories[0].id,
    date: initial?.date || new Date().toISOString().split("T")[0],
    notes: initial?.notes || "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { ...form, amount: parseFloat(form.amount) };
    if (initial) onSave({ ...data, id: initial.id });
    else onSave(data);
    onClose();
  }

  const inp = {
    background: "var(--input-background)", border: "1px solid var(--border)", borderRadius: "10px",
    color: "var(--foreground)", padding: "10px 14px", width: "100%", fontSize: "0.875rem", outline: "none",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {(["income", "expense"] as const).map(t => (
          <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
            className="flex-1 py-2.5 text-sm font-medium transition-colors"
            style={{
              background: form.type === t ? (t === "income" ? "rgba(16,217,164,0.15)" : "rgba(239,68,68,0.15)") : "transparent",
              color: form.type === t ? (t === "income" ? "#10d9a4" : "#ef4444") : "var(--muted-foreground)",
            }}>
            {t === "income" ? "Receita" : "Despesa"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Valor (R$)</label>
          <input style={inp} type="number" step="0.01" min="0" required value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
        </div>
        <div>
          <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Data</label>
          <input style={inp} type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Descrição</label>
        <input style={inp} required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Supermercado" />
      </div>
      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Categoria</label>
        <select style={{ ...inp, cursor: "pointer" }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          {categories.map(c => <option key={c.id} value={c.id} style={{ background: "#141828" }}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Observações</label>
        <textarea style={{ ...inp, resize: "none", height: "72px" }} value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas..." />
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
          Cancelar
        </button>
        <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90"
          style={{ background: "var(--primary)" }}>
          {initial ? "Salvar" : "Adicionar"}
        </button>
      </div>
    </form>
  );
}

export function Transactions() {
  const { transactions, categories, addTransaction, updateTransaction, deleteTransaction } = useFinance();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [page, setPage] = useState(1);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = transactions.filter(t => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterMonth !== "all" && !t.date.startsWith(filterMonth)) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const months = Array.from(new Set(transactions.map(t => t.date.slice(0, 7)))).sort().reverse();

  const sel = { background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--foreground)", padding: "9px 12px", fontSize: "0.82rem", outline: "none", cursor: "pointer" };

  const overlay = { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" };
  const dialog = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "20px", padding: "24px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" as const };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-white" style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700 }}>Transações</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>{filtered.length} registros encontrados</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 w-full sm:w-auto"
          style={{ background: "var(--primary)" }}>
          <Plus size={16} /> Nova Transação
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl p-3 sm:p-4 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
          <Search size={15} style={{ color: "var(--muted-foreground)", shrink: 0 }} />
          <input
            style={{ background: "transparent", outline: "none", color: "var(--foreground)", width: "100%", fontSize: "0.875rem" }}
            placeholder="Buscar transações..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {/* Filter selects */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select style={sel} value={filterType} onChange={e => { setFilterType(e.target.value as any); setPage(1); }}>
            <option value="all" style={{ background: "#141828" }}>Todos os tipos</option>
            <option value="income" style={{ background: "#141828" }}>Receitas</option>
            <option value="expense" style={{ background: "#141828" }}>Despesas</option>
          </select>
          <select style={sel} value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
            <option value="all" style={{ background: "#141828" }}>Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id} style={{ background: "#141828" }}>{c.icon} {c.name}</option>)}
          </select>
          <select style={sel} value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}>
            <option value="all" style={{ background: "#141828" }}>Todos os meses</option>
            {months.map(m => {
              const [year, month] = m.split("-");

              return (
                <option key={m} value={m} style={{ background: "#141828" }}>
                  {new Date(
                    Number(year),
                    Number(month) - 1,
                    1
                  ).toLocaleString("pt-BR", {
                    month: "long",
                    year: "numeric"
                  })}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Transactions — cards on mobile, table on desktop */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>

        {/* Mobile card list */}
        <div className="block sm:hidden">
          {paged.length === 0 ? (
            <div className="py-16 text-center" style={{ color: "var(--muted-foreground)" }}>
              <p style={{ fontSize: "2rem", marginBottom: "8px" }}>🔍</p>
              <p>Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {paged.map(tx => {
                const cat = categories.find(c => c.id === tx.category);
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: cat ? `${cat.color}20` : "var(--secondary)" }}>
                        <span style={{ fontSize: "14px" }}>{cat?.icon || "💳"}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white truncate" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{tx.description}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="px-1.5 py-0.5 rounded-full text-xs"
                            style={{ background: cat ? `${cat.color}20` : "var(--secondary)", color: cat?.color || "var(--muted-foreground)" }}>
                            {cat?.name}
                          </span>
                          <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>
                            {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span style={{ color: tx.type === "income" ? "#10d9a4" : "#ef4444", fontWeight: 600, fontSize: "0.875rem", fontFamily: "var(--font-mono)" }}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => setEditingTx(tx)} className="p-1.5 rounded-lg" style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setDeletingId(tx.id)} className="p-1.5 rounded-lg" style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "640px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Descrição", "Categoria", "Data", "Tipo", "Valor", "Ações"].map(h => (
                  <th key={h} style={{ padding: "13px 16px", textAlign: "left", color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {paged.map((tx, i) => {
                  const cat = categories.find(c => c.id === tx.category);
                  return (
                    <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.04 }} style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--secondary)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: cat ? `${cat.color}20` : "var(--secondary)" }}>
                            <span style={{ fontSize: "13px" }}>{cat?.icon || "💳"}</span>
                          </div>
                          <span className="text-white" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{tx.description}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="px-2 py-1 rounded-full text-xs" style={{ background: cat ? `${cat.color}20` : "var(--secondary)", color: cat?.color || "var(--muted-foreground)" }}>
                          {cat?.name || "-"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                          background: tx.type === "income" ? "rgba(16,217,164,0.12)" : "rgba(239,68,68,0.12)",
                          color: tx.type === "income" ? "#10d9a4" : "#ef4444"
                        }}>
                          {tx.type === "income" ? "Receita" : "Despesa"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.875rem", color: tx.type === "income" ? "#10d9a4" : "#ef4444", whiteSpace: "nowrap" }}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditingTx(tx)} className="p-1.5 rounded-lg hover:bg-blue-500/10" style={{ color: "var(--muted-foreground)" }}><Edit2 size={14} /></button>
                          <button onClick={() => setDeletingId(tx.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: "var(--muted-foreground)" }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {paged.length === 0 && (
                <tr><td colSpan={6}>
                  <div className="py-16 text-center" style={{ color: "var(--muted-foreground)" }}>
                    <p style={{ fontSize: "2rem", marginBottom: "8px" }}>🔍</p>
                    <p>Nenhuma transação encontrada</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>Página {page} de {totalPages}</p>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: page === i + 1 ? "var(--primary)" : "var(--secondary)", color: page === i + 1 ? "#fff" : "var(--muted-foreground)" }}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={overlay} onClick={() => setShowAdd(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={dialog} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white" style={{ fontWeight: 600 }}>Nova Transação</h2>
                <button onClick={() => setShowAdd(false)} style={{ color: "var(--muted-foreground)" }}><X size={20} /></button>
              </div>
              <TransactionForm onSave={addTransaction} onClose={() => setShowAdd(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingTx && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={overlay} onClick={() => setEditingTx(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={dialog} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white" style={{ fontWeight: 600 }}>Editar Transação</h2>
                <button onClick={() => setEditingTx(null)} style={{ color: "var(--muted-foreground)" }}><X size={20} /></button>
              </div>
              <TransactionForm initial={editingTx} onSave={updateTransaction} onClose={() => setEditingTx(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={overlay} onClick={() => setDeletingId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              style={{ ...dialog, maxWidth: "360px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
              <p style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🗑️</p>
              <h3 className="text-white mb-2" style={{ fontWeight: 600 }}>Excluir transação?</h3>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginBottom: "24px" }}>Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>Cancelar</button>
                <button onClick={() => { deleteTransaction(deletingId); setDeletingId(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "var(--destructive)" }}>Excluir</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
