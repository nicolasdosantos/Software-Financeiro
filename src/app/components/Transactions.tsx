import { useState } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Edit2, Trash2, ChevronUp, ChevronDown, X, Copy, Ban, Upload } from "lucide-react";
import { toast } from "sonner";
import { useFinance, formatCurrency, getMonthName, getTodayDateInput, toLocalDate, getDistinctMonths } from "../context/FinanceContext";
import type { Transaction, RecurringTransaction, NewRecurringTransaction, NewSplitTransaction } from "../context/FinanceContext";
import { Modal } from "./shared/Modal";
import { ImportTransactionsModal } from "./ImportTransactions";
import { ConfirmDeleteDialog } from "./shared/ConfirmDeleteDialog";
import { EmptyState } from "./shared/EmptyState";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

function TransactionsSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="rounded-2xl p-3 sm:p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 8;

type SortKey = "date" | "amount" | "description" | "category";

const TABLE_COLUMNS: { key: SortKey | null; label: string }[] = [
  { key: "description", label: "Descrição" },
  { key: "category", label: "Categoria" },
  { key: "date", label: "Data" },
  { key: null, label: "Tipo" },
  { key: "amount", label: "Valor" },
  { key: null, label: "Ações" },
];

/** "🔁" pra recorrência indefinida, "2/3" pra parcelado. null = transação avulsa. */
function getRecurringBadge(tx: Transaction, recurringTransactions: RecurringTransaction[]): string | null {
  if (!tx.recurring_id) return null;
  if (tx.installment_number) {
    const series = recurringTransactions.find(r => r.id === tx.recurring_id);
    return `${tx.installment_number}/${series?.installmentsTotal ?? "?"}`;
  }
  return "🔁";
}

/** Só recorrências indefinidas e ainda ativas podem ser canceladas — parcelado
 * já nasce completo (nada a interromper) e uma já cancelada não precisa de novo. */
function canCancelRecurring(tx: Transaction, recurringTransactions: RecurringTransaction[]): boolean {
  if (!tx.recurring_id) return false;
  const series = recurringTransactions.find(r => r.id === tx.recurring_id);
  return Boolean(series?.active && series.installmentsTotal === null);
}

/** "✂️ 3x" quando a transação é uma das partes de uma compra dividida entre
 * categorias — a contagem vem de contar quantas partes ainda existem entre as
 * transações carregadas, não de um total fixo guardado em algum lugar (não
 * existe "tabela do grupo", só o split_group_id em comum). */
function getSplitBadge(tx: Transaction, transactions: Transaction[]): string | null {
  if (!tx.split_group_id) return null;
  const partCount = transactions.filter(t => t.split_group_id === tx.split_group_id).length;
  // Se sobrou só 1 parte (as outras foram apagadas depois), não faz mais
  // sentido rotular como "dividida" — virou uma transação avulsa normal.
  if (partCount < 2) return null;
  return `✂️ ${partCount}x`;
}

interface TransactionFormProps {
  initial?: Transaction;
  // Pré-preenche o formulário de uma NOVA transação com os valores de outra
  // (usado por "Duplicar"), sem transformar isso numa edição — ao contrário
  // de "initial", salvar aqui sempre cria uma transação nova (onAdd).
  prefill?: Omit<Transaction, "id">;
  onAdd: (t: Omit<Transaction, "id">) => Promise<void>;
  onUpdate: (t: Transaction) => Promise<void>;
  onAddRecurring: (r: NewRecurringTransaction) => Promise<void>;
  onAddSplit: (s: NewSplitTransaction) => Promise<void>;
  onClose: () => void;
}

type RepeatMode = "none" | "monthly" | "installments";
interface SplitPartInput {
  categoryId: string;
  amount: string;
}

function TransactionForm({ initial, prefill, onAdd, onUpdate, onAddRecurring, onAddSplit, onClose }: TransactionFormProps) {
  const { categories } = useFinance();
  const source = initial ?? prefill;
  const [form, setForm] = useState({
    type: source?.type || "expense" as "income" | "expense",
    amount: source?.amount?.toString() || "",
    description: source?.description || "",
    category: source?.category || categories[0]?.id || "",
    date: source?.date || getTodayDateInput(),
    notes: source?.notes || "",
  });
  const [submitting, setSubmitting] = useState(false);
  // Repetir e Dividir só fazem sentido criando uma transação do zero — editar
  // uma ocorrência existente ou duplicar não mexe em nenhum dos dois.
  const canRepeat = !initial && !prefill;
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [installmentsCount, setInstallmentsCount] = useState("3");
  // Repetir e Dividir são mutuamente exclusivos por enquanto — combinar as
  // duas (ex: aluguel recorrente já dividido entre categorias) fica pra
  // depois, é bem mais complexo de acertar.
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitParts, setSplitParts] = useState<SplitPartInput[]>([
    { categoryId: categories[0]?.id || "", amount: "" },
    { categoryId: categories[1]?.id || categories[0]?.id || "", amount: "" },
  ]);
  const splitTotal = splitParts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  function updateSplitPart(index: number, patch: Partial<SplitPartInput>) {
    setSplitParts(prev => prev.map((p, i) => i === index ? { ...p, ...patch } : p));
  }
  function addSplitPart() {
    setSplitParts(prev => [...prev, { categoryId: categories[0]?.id || "", amount: "" }]);
  }
  function removeSplitPart(index: number) {
    setSplitParts(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const isReallySplitting = canRepeat && isSplitting;

    if (isReallySplitting) {
      if (splitParts.length < 2) {
        toast.error("Adicione pelo menos 2 categorias pra dividir.");
        return;
      }
      const parts = splitParts.map(p => ({ categoryId: p.categoryId, amount: parseFloat(p.amount) }));
      if (parts.some(p => !p.categoryId || Number.isNaN(p.amount) || p.amount <= 0)) {
        toast.error("Escolha uma categoria e informe um valor válido (maior que zero) em cada parte.");
        return;
      }

      setSubmitting(true);
      try {
        await onAddSplit({
          type: form.type,
          description: form.description,
          date: form.date,
          notes: form.notes || undefined,
          parts,
        });
        toast.success("Transação dividida criada com sucesso!");
        onClose();
      } catch (err) {
        console.error("Erro ao salvar transação dividida:", err);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const amount = parseFloat(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    const isRepeating = canRepeat && repeatMode !== "none";
    let installmentsTotal: number | null = null;
    if (isRepeating && repeatMode === "installments") {
      const n = parseInt(installmentsCount, 10);
      if (!Number.isInteger(n) || n < 2) {
        toast.error("Informe em quantas parcelas (mínimo 2).");
        return;
      }
      installmentsTotal = n;
    }

    setSubmitting(true);
    try {
      const data = { ...form, amount };
      if (initial) {
        await onUpdate({ ...data, id: initial.id });
      } else if (isRepeating) {
        await onAddRecurring({
          type: data.type,
          amount: data.amount,
          description: data.description,
          categoryId: data.category,
          notes: data.notes || undefined,
          startDate: data.date,
          installmentsTotal,
        });
      } else {
        await onAdd(data);
      }
      toast.success(
        initial ? "Transação atualizada com sucesso!" : isRepeating ? "Recorrência criada com sucesso!" : "Transação adicionada com sucesso!"
      );
      onClose();
    } catch (err) {
      console.error("Erro ao salvar transação:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex rounded-xl overflow-hidden border border-border">
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
        <div className="space-y-1.5">
          <Label htmlFor="tx-amount">Valor (R$)</Label>
          <Input id="tx-amount" type="number" step="0.01" min="0" required={!isSplitting} disabled={isSplitting}
            value={isSplitting ? splitTotal.toFixed(2) : form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-date">Data</Label>
          <Input id="tx-date" type="date" required value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tx-description">Descrição</Label>
        <Input id="tx-description" required value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Supermercado" />
      </div>
      {isSplitting ? (
        <div className="space-y-2">
          <Label>Dividir entre categorias</Label>
          {splitParts.map((part, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Select value={part.categoryId} onValueChange={(value) => updateSplitPart(i, { categoryId: value })}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" step="0.01" min="0" className="w-28 shrink-0" placeholder="0,00"
                value={part.amount} onChange={e => updateSplitPart(i, { amount: e.target.value })} />
              {splitParts.length > 2 && (
                <button type="button" onClick={() => removeSplitPart(i)} aria-label="Remover esta parte da divisão"
                  className="shrink-0 p-1.5 rounded-lg" style={{ color: "var(--muted-foreground)" }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between pt-0.5">
            <Button type="button" variant="ghost" size="sm" onClick={addSplitPart}>
              <Plus size={13} /> Adicionar categoria
            </Button>
            <span style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>Total: {formatCurrency(splitTotal)}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="tx-category">Categoria</Label>
          <Select value={form.category} onValueChange={(value) => setForm(f => ({ ...f, category: value }))}>
            <SelectTrigger id="tx-category" className="w-full">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {canRepeat && (
        <label className="flex items-center gap-2 cursor-pointer" htmlFor="tx-split">
          <Checkbox id="tx-split" checked={isSplitting} disabled={repeatMode !== "none"}
            onCheckedChange={(checked) => setIsSplitting(checked === true)} />
          <Label htmlFor="tx-split" className="cursor-pointer" style={{ fontWeight: 400, color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
            Dividir entre categorias
          </Label>
        </label>
      )}
      {canRepeat && (
        <div className="space-y-1.5">
          <Label htmlFor="tx-repeat">Repetir</Label>
          <Select value={repeatMode} onValueChange={(value) => setRepeatMode(value as RepeatMode)} disabled={isSplitting}>
            <SelectTrigger id="tx-repeat" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não repete</SelectItem>
              <SelectItem value="monthly">Todo mês</SelectItem>
              <SelectItem value="installments">Parcelado</SelectItem>
            </SelectContent>
          </Select>
          {isSplitting && (
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
              Ainda não dá pra combinar com "Dividir entre categorias".
            </p>
          )}
          {!isSplitting && repeatMode === "monthly" && (
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
              Lança este mês agora; os próximos meses são gerados sozinhos conforme o tempo passa — sem fim definido, até você cancelar.
            </p>
          )}
          {!isSplitting && repeatMode === "installments" && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="tx-installments">Em quantas vezes?</Label>
              <Input id="tx-installments" type="number" min="2" step="1" value={installmentsCount}
                onChange={e => setInstallmentsCount(e.target.value)} placeholder="Ex: 3" />
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
                Cria todas as parcelas de uma vez, uma por mês a partir da data acima.
              </p>
            </div>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="tx-notes">Observações</Label>
        <Textarea id="tx-notes" className="min-h-[72px]" value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas..." />
      </div>
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? "Salvando..." : initial ? "Salvar" : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}

export function Transactions() {
  const {
    transactions, categories, recurringTransactions,
    addTransaction, updateTransaction, deleteTransaction,
    addRecurringTransaction, cancelRecurringTransaction, addSplitTransaction,
    loading,
  } = useFinance();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  // Intervalo de datas livre, independente do filtro de mês — dá pra auditar
  // qualquer período (ex: uma quinzena entre pagamentos), não só um mês
  // inteiro do calendário. Os dois filtros combinam (AND) se usados juntos.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [duplicatingTx, setDuplicatingTx] = useState<Transaction | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cancelingRecurringId, setCancelingRecurringId] = useState<string | null>(null);

  if (loading) return <TransactionsSkeleton />;

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "description" || key === "category" ? "asc" : "desc");
    }
  }

  const hasCustomFilters = search !== "" || filterType !== "all" || filterCategory !== "all" || filterMonth !== "all" || dateFrom !== "" || dateTo !== "";

  function clearFilters() {
    setSearch("");
    setFilterType("all");
    setFilterCategory("all");
    setFilterMonth("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const filtered = transactions.filter(t => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterMonth !== "all" && !t.date.startsWith(filterMonth)) return false;
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    let result: number;
    if (sortBy === "date") result = a.date.localeCompare(b.date);
    else if (sortBy === "amount") result = a.amount - b.amount;
    else if (sortBy === "description") result = a.description.localeCompare(b.description, "pt-BR");
    else {
      const nameA = categories.find(c => c.id === a.category)?.name || "";
      const nameB = categories.find(c => c.id === b.category)?.name || "";
      result = nameA.localeCompare(nameB, "pt-BR");
    }
    return sortDir === "asc" ? result : -result;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const months = getDistinctMonths(transactions).reverse();

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700, color: "var(--foreground)" }}>Transações</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>{filtered.length} registros encontrados</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="secondary" onClick={() => setShowImport(true)} className="flex-1 sm:flex-none">
            <Upload size={16} /> Importar
          </Button>
          <Button onClick={() => setShowAdd(true)} className="flex-1 sm:flex-none">
            <Plus size={16} /> Nova Transação
          </Button>
        </div>
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
          <Select value={filterType} onValueChange={(value) => { setFilterType(value as "all" | "income" | "expense"); setPage(1); }}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={(value) => { setFilterCategory(value); setPage(1); }}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={(value) => { setFilterMonth(value); setPage(1); }}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {months.map(m => (
                <SelectItem key={m} value={m}>{getMonthName(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Intervalo de datas livre — combina com o filtro de mês acima, útil
            pra auditar um período específico (ex: entre dois pagamentos) em
            vez de só um mês inteiro do calendário. */}
        <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="tx-date-from" className="text-xs" style={{ color: "var(--muted-foreground)" }}>De</Label>
            <Input id="tx-date-from" type="date" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-date-to" className="text-xs" style={{ color: "var(--muted-foreground)" }}>Até</Label>
            <Input id="tx-date-to" type="date" value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }} />
          </div>
          {hasCustomFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="col-span-2 sm:col-span-1">
              <X size={14} /> Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Transactions — cards on mobile, table on desktop */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>

        {/* Mobile card list */}
        <div className="block sm:hidden">
          {paged.length === 0 ? (
            transactions.length === 0 ? (
              <EmptyState icon="📭" title="Nenhuma transação ainda" subtitle="Adicione a primeira pra começar a acompanhar suas finanças" />
            ) : (
              <EmptyState icon="🔍" title="Nenhuma transação encontrada" subtitle="Tente ajustar a busca ou os filtros" />
            )
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {paged.map(tx => {
                const cat = categories.find(c => c.id === tx.category);
                const recurringBadge = getRecurringBadge(tx, recurringTransactions);
                const splitBadge = getSplitBadge(tx, transactions);
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: cat ? `${cat.color}20` : "var(--secondary)" }}>
                        <span style={{ fontSize: "14px" }}>{cat?.icon || "💳"}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate" style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)" }}>{tx.description}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="px-1.5 py-0.5 rounded-full text-xs"
                            style={{ background: cat ? `${cat.color}20` : "var(--secondary)", color: cat?.color || "var(--muted-foreground)" }}>
                            {cat?.name}
                          </span>
                          {recurringBadge && (
                            <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: "rgba(var(--primary-rgb),0.14)", color: "var(--primary)" }}>
                              {recurringBadge}
                            </span>
                          )}
                          {splitBadge && (
                            <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: "rgba(var(--primary-rgb),0.14)", color: "var(--primary)" }}>
                              {splitBadge}
                            </span>
                          )}
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
                        {canCancelRecurring(tx, recurringTransactions) && (
                          <button onClick={() => setCancelingRecurringId(tx.recurring_id!)} aria-label={`Cancelar recorrência de "${tx.description}"`} className="p-1.5 rounded-lg" style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}>
                            <Ban size={13} />
                          </button>
                        )}
                        <button onClick={() => setDuplicatingTx(tx)} aria-label={`Duplicar transação "${tx.description}"`} className="p-1.5 rounded-lg" style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}>
                          <Copy size={13} />
                        </button>
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
                {TABLE_COLUMNS.map(col => (
                  <th key={col.label} style={{ padding: "13px 16px", textAlign: "left", color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 500, whiteSpace: "nowrap" }}>
                    {col.key ? (
                      <button type="button" onClick={() => toggleSort(col.key!)}
                        className="flex items-center gap-1 transition-colors hover:text-[var(--foreground)]"
                        style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer" }}>
                        {col.label}
                        {sortBy === col.key && (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {paged.map((tx, i) => {
                  const cat = categories.find(c => c.id === tx.category);
                  const recurringBadge = getRecurringBadge(tx, recurringTransactions);
                  const splitBadge = getSplitBadge(tx, transactions);
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
                          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)" }}>{tx.description}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-1 rounded-full text-xs" style={{ background: cat ? `${cat.color}20` : "var(--secondary)", color: cat?.color || "var(--muted-foreground)" }}>
                            {cat?.name || "-"}
                          </span>
                          {recurringBadge && (
                            <span className="px-2 py-1 rounded-full text-xs" style={{ background: "rgba(var(--primary-rgb),0.14)", color: "var(--primary)" }}>
                              {recurringBadge}
                            </span>
                          )}
                          {splitBadge && (
                            <span className="px-2 py-1 rounded-full text-xs" style={{ background: "rgba(var(--primary-rgb),0.14)", color: "var(--primary)" }}>
                              {splitBadge}
                            </span>
                          )}
                        </div>
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
                          {canCancelRecurring(tx, recurringTransactions) && (
                            <button onClick={() => setCancelingRecurringId(tx.recurring_id!)} aria-label={`Cancelar recorrência de "${tx.description}"`} className="p-1.5 rounded-lg hover:bg-[var(--secondary)]" style={{ color: "var(--muted-foreground)" }}><Ban size={14} /></button>
                          )}
                          <button onClick={() => setDuplicatingTx(tx)} aria-label={`Duplicar transação "${tx.description}"`} className="p-1.5 rounded-lg hover:bg-[var(--secondary)]" style={{ color: "var(--muted-foreground)" }}><Copy size={14} /></button>
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
                  {transactions.length === 0 ? (
                    <EmptyState icon="📭" title="Nenhuma transação ainda" subtitle="Adicione a primeira pra começar a acompanhar suas finanças" />
                  ) : (
                    <EmptyState icon="🔍" title="Nenhuma transação encontrada" subtitle="Tente ajustar a busca ou os filtros" />
                  )}
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

      <ImportTransactionsModal open={showImport} onClose={() => setShowImport(false)} />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nova Transação">
        <TransactionForm onAdd={addTransaction} onUpdate={updateTransaction} onAddRecurring={addRecurringTransaction} onAddSplit={addSplitTransaction} onClose={() => setShowAdd(false)} />
      </Modal>

      <Modal open={editingTx !== null} onClose={() => setEditingTx(null)} title="Editar Transação">
        {editingTx && (
          <TransactionForm initial={editingTx} onAdd={addTransaction} onUpdate={updateTransaction} onAddRecurring={addRecurringTransaction} onAddSplit={addSplitTransaction} onClose={() => setEditingTx(null)} />
        )}
      </Modal>

      <Modal open={duplicatingTx !== null} onClose={() => setDuplicatingTx(null)} title="Duplicar Transação">
        {duplicatingTx && (
          <TransactionForm
            prefill={{ ...duplicatingTx, date: getTodayDateInput() }}
            onAdd={addTransaction}
            onUpdate={updateTransaction}
            onAddRecurring={addRecurringTransaction}
            onAddSplit={addSplitTransaction}
            onClose={() => setDuplicatingTx(null)}
          />
        )}
      </Modal>

      <ConfirmDeleteDialog
        open={cancelingRecurringId !== null}
        onClose={() => setCancelingRecurringId(null)}
        onConfirm={() => cancelRecurringTransaction(cancelingRecurringId!)}
        title="Cancelar recorrência?"
        description="As transações já lançadas continuam existindo — só paramos de gerar as próximas."
        successMessage="Recorrência cancelada."
        errorLog="Erro ao cancelar transação recorrente:"
        icon="🔁"
        confirmLabel="Cancelar recorrência"
        confirmingLabel="Cancelando..."
      />

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
