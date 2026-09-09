import { useState } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useFinance, formatCurrency, getMonthName, getTodayDateInput, toLocalDate, getDistinctMonths } from "../context/FinanceContext";
import type { Transaction } from "../context/FinanceContext";
import { Modal } from "./shared/Modal";
import { ConfirmDeleteDialog } from "./shared/ConfirmDeleteDialog";

const ITEMS_PER_PAGE = 8;

interface TransactionFormProps {
  initial?: Transaction;
  onAdd: (t: Omit<Transaction, "id">) => Promise<void>;
  onUpdate: (t: Transaction) => Promise<void>;
  onClose: () => void;
}

function TransactionForm({ initial, onAdd, onUpdate, onClose }: TransactionFormProps) {
  const { categories } = useFinance();
  const [form, setForm] = useState({
    type: initial?.type || "expense" as "income" | "expense",
    amount: initial?.amount?.toString() || "",
    description: initial?.description || "",
    category: initial?.category || categories[0]?.id || "",
    date: initial?.date || getTodayDateInput(),
    notes: initial?.notes || "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const amount = parseFloat(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    setSubmitting(true);
    try {
      const data = { ...form, amount };
      if (initial) await onUpdate({ ...data, id: initial.id });
      else await onAdd(data);
      toast.success(initial ? "Transação atualizada com sucesso!" : "Transação adicionada com sucesso!");
      onClose();
    } catch (err) {
      console.error("Erro ao salvar transação:", err);
    } finally {
      setSubmitting(false);
    }
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
              color: form.type === t ? (t === "income" ? "var(--success)" : "var(--red)") : "var(--muted-foreground)",
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
        <select style={{ ...inp, cursor: "pointer" }} required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          {categories.length === 0 && <option value="" style={{ background: "#141828" }}>Carregando categorias...</option>}
          {categories.map(c => <option key={c.id} value={c.id} style={{ background: "#141828" }}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Observações</label>
        <textarea style={{ ...inp, resize: "none", height: "72px" }} value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas..." />
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
          Cancelar
        </button>
        <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90"
          style={{ background: "var(--primary)", opacity: submitting ? 0.7 : 1 }}>
          {submitting ? "Salvando..." : initial ? "Salvar" : "Adicionar"}
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
  const months = getDistinctMonths(transactions).reverse();

  const sel = { background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--foreground)", padding: "9px 12px", fontSize: "0.82rem", outline: "none", cursor: "pointer" };

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
          <Search size={15} className="shrink-0" style={{ color: "var(--muted-foreground)" }} />
          <input
            style={{ background: "transparent", outline: "none", color: "var(--foreground)", width: "100%", fontSize: "0.875rem" }}
            placeholder="Buscar transações..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {/* Filter selects */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select style={sel} value={filterType} onChange={e => { setFilterType(e.target.value as "all" | "income" | "expense"); setPage(1); }}>
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
            {months.map(m => (
              <option key={m} value={m} style={{ background: "#141828" }}>
                {getMonthName(m)}
              </option>
            ))}
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
                            {toLocalDate(tx.date).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span style={{ color: tx.type === "income" ? "var(--success)" : "var(--red)", fontWeight: 600, fontSize: "0.875rem", fontFamily: "var(--font-mono)" }}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => setEditingTx(tx)} aria-label={`Editar transação "${tx.description}"`} className="p-1.5 rounded-lg" style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setDeletingId(tx.id)} aria-label={`Excluir transação "${tx.description}"`} className="p-1.5 rounded-lg" style={{ color: "var(--destructive)", background: "rgba(239,68,68,0.1)" }}>
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
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-[var(--secondary)]"
                      style={{ borderBottom: "1px solid var(--border)" }}>
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
                        {toLocalDate(tx.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                          background: tx.type === "income" ? "rgba(16,217,164,0.12)" : "rgba(239,68,68,0.12)",
                          color: tx.type === "income" ? "var(--success)" : "var(--red)"
                        }}>
                          {tx.type === "income" ? "Receita" : "Despesa"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.875rem", color: tx.type === "income" ? "var(--success)" : "var(--red)", whiteSpace: "nowrap" }}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditingTx(tx)} aria-label={`Editar transação "${tx.description}"`} className="p-1.5 rounded-lg hover:bg-blue-500/10" style={{ color: "var(--muted-foreground)" }}><Edit2 size={14} /></button>
                          <button onClick={() => setDeletingId(tx.id)} aria-label={`Excluir transação "${tx.description}"`} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: "var(--muted-foreground)" }}><Trash2 size={14} /></button>
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
                  aria-label={`Ir para página ${i + 1}`} aria-current={page === i + 1 ? "page" : undefined}
                  className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: page === i + 1 ? "var(--primary)" : "var(--secondary)", color: page === i + 1 ? "#fff" : "var(--muted-foreground)" }}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nova Transação">
        <TransactionForm onAdd={addTransaction} onUpdate={updateTransaction} onClose={() => setShowAdd(false)} />
      </Modal>

      <Modal open={editingTx !== null} onClose={() => setEditingTx(null)} title="Editar Transação">
        {editingTx && (
          <TransactionForm initial={editingTx} onAdd={addTransaction} onUpdate={updateTransaction} onClose={() => setEditingTx(null)} />
        )}
      </Modal>

      <ConfirmDeleteDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteTransaction(deletingId!)}
        title="Excluir transação?"
        description="Esta ação não pode ser desfeita."
        successMessage="Transação excluída com sucesso!"
        errorLog="Erro ao excluir transação:"
      />
    </div>
  );
}
