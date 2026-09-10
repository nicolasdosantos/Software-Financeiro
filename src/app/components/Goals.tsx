import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "motion/react";
import { Plus, Edit2, Trash2, CheckCircle, CircleDollarSign } from "lucide-react";
import { toast } from "sonner";
import { useFinance, formatCurrency, toLocalDate, getTodayDateInput } from "../context/FinanceContext";
import type { Goal, Category } from "../context/FinanceContext";
import { Modal } from "./shared/Modal";
import { ConfirmDeleteDialog } from "./shared/ConfirmDeleteDialog";
import { EmptyState } from "./shared/EmptyState";
import { ColorPicker } from "./shared/ColorPicker";
import { IconPicker } from "./shared/IconPicker";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

function GoalsSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-3 w-full rounded-full mb-3" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}

const ICONS = ["🎯", "🏠", "✈️", "💻", "🚗", "🛡️", "📚", "💍", "🎓", "🏖️", "💰", "🏋️"];
const COLORS = ["#204bca", "#10d9a4", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#3b82f6", "#22c55e"];

interface GoalFormProps {
  initial?: Goal;
  onAdd: (g: Omit<Goal, "id">) => Promise<void>;
  onUpdate: (g: Goal) => Promise<void>;
  onClose: () => void;
}

function GoalForm({ initial, onAdd, onUpdate, onClose }: GoalFormProps) {
  const [form, setForm] = useState({
    title: initial?.title || "", description: initial?.description || "",
    target: initial?.target?.toString() || "", current: initial?.current?.toString() || "0",
    deadline: initial?.deadline || "", icon: initial?.icon || "🎯", color: initial?.color || "#204bca",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const target = parseFloat(form.target);
    const current = parseFloat(form.current);
    if (Number.isNaN(target) || target <= 0) {
      toast.error("Informe um valor alvo válido maior que zero.");
      return;
    }
    if (Number.isNaN(current) || current < 0) {
      toast.error("Informe um valor atual válido.");
      return;
    }
    if (current > target) {
      toast.error("O valor atual não pode ser maior que o valor alvo.");
      return;
    }

    setSubmitting(true);
    try {
      const data = { ...form, target, current };
      if (initial) await onUpdate({ ...data, id: initial.id });
      else await onAdd(data);
      toast.success(initial ? "Meta atualizada com sucesso!" : "Meta criada com sucesso!");
      onClose();
    } catch (err) {
      console.error("Erro ao salvar meta:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="goal-title">Título</Label>
        <Input id="goal-title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Reserva de Emergência" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="goal-description">Descrição</Label>
        <Input id="goal-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição da meta..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="goal-target">Valor alvo (R$)</Label>
          <Input id="goal-target" type="number" min="1" step="0.01" required value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal-current">Valor atual (R$)</Label>
          <Input id="goal-current" type="number" min="0" step="0.01" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="goal-deadline">Prazo</Label>
        <Input id="goal-deadline" type="date" required value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
      </div>
      <div>
        <Label className="mb-2">Ícone</Label>
        <IconPicker value={form.icon} presets={ICONS} onChange={(ic) => setForm(f => ({ ...f, icon: ic }))} />
      </div>
      <div>
        <Label className="mb-2">Cor</Label>
        <ColorPicker value={form.color} presets={COLORS} onChange={(c) => setForm(f => ({ ...f, color: c }))} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">Cancelar</Button>
        <Button type="submit" disabled={submitting} className="flex-1">{submitting ? "Salvando..." : initial ? "Salvar" : "Criar Meta"}</Button>
      </div>
    </form>
  );
}

interface GoalContributionFormProps {
  goal: Goal;
  categories: Category[];
  onSave: (amount: number, categoryId: string) => Promise<void>;
  onClose: () => void;
}

function GoalContributionForm({ goal, categories, onSave, onClose }: GoalContributionFormProps) {
  const [amount, setAmount] = useState("");
  const defaultCategoryId = categories.find(c => c.name === "Investimentos")?.id || categories[0]?.id || "";
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [submitting, setSubmitting] = useState(false);
  const remaining = Math.max(0, goal.target - goal.current);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const value = parseFloat(amount);
    if (Number.isNaN(value) || value <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }
    if (!categoryId) {
      toast.error("Selecione de qual categoria esse valor está saindo.");
      return;
    }

    setSubmitting(true);
    try {
      await onSave(value, categoryId);
      toast.success("Valor guardado com sucesso!");
      onClose();
    } catch (err) {
      console.error("Erro ao guardar valor na meta:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
        <p style={{ fontWeight: 600, color: "var(--foreground)" }}>{goal.title}</p>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
          Falta {formatCurrency(remaining)} para completar a meta.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-contribution-amount">Valor guardado (R$)</Label>
        <Input
          id="goal-contribution-amount"
          autoFocus
          type="number"
          min="0.01"
          max={remaining || undefined}
          step="0.01"
          required
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0,00"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-contribution-category">De onde esse valor está saindo?</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="goal-contribution-category" className="w-full">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>
          Esse valor vira uma despesa de verdade nessa categoria, pra sair do seu saldo de fato — não só um número somado na meta.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">Cancelar</Button>
        <Button type="submit" disabled={submitting} className="flex-1">{submitting ? "Salvando..." : "Adicionar"}</Button>
      </div>
    </form>
  );
}

export function Goals() {
  const { goals, categories, addGoal, updateGoal, deleteGoal, addTransaction, loading } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contributing, setContributing] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (loading) return <GoalsSkeleton />;

  async function addContribution(goal: Goal, amount: number, categoryId: string) {
    // Registra a saída como uma despesa de verdade primeiro — assim o valor
    // guardado na meta sempre corresponde a dinheiro que realmente saiu do
    // saldo, e não só a um número solto somado na meta.
    await addTransaction({
      type: "expense",
      amount,
      description: `Aporte para meta: ${goal.title}`,
      category: categoryId,
      date: getTodayDateInput(),
    });
    await updateGoal({
      ...goal,
      current: Math.min(goal.target, goal.current + amount),
    });
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700, color: "var(--foreground)" }}>Metas Financeiras</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Acompanhe seu progresso rumo aos objetivos</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus size={16} /> Nova Meta
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <EmptyState icon="🎯" title="Nenhuma meta criada" subtitle="Comece criando sua primeira meta financeira" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {goals.map((goal, i) => {
            const pct = Math.min(100, (goal.current / goal.target) * 100);
            const done = pct >= 100;
            const daysLeft = Math.ceil((toLocalDate(goal.deadline).getTime() - Date.now()) / 86400000);
            const monthlyNeeded = daysLeft > 0 && !done ? (goal.target - goal.current) / (daysLeft / 30) : 0;

            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }} whileHover={{ y: -2 }}
                className="rounded-2xl p-4 sm:p-5 relative overflow-hidden"
                style={{ background: "var(--card)", border: `1px solid ${done ? goal.color + "40" : "var(--border)"}` }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-10 translate-x-10"
                  style={{ background: goal.color }} />

                <div className="flex items-start justify-between mb-4 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: `${goal.color}20` }}>{goal.icon}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--foreground)" }}>{goal.title}</h3>
                        {done && <CheckCircle size={14} style={{ color: goal.color }} />}
                      </div>
                      <p className="truncate" style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{goal.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditing(goal)} aria-label={`Editar meta "${goal.title}"`} className="p-1.5 rounded-lg hover:bg-[var(--secondary)]" style={{ color: "var(--muted-foreground)" }}><Edit2 size={13} /></button>
                    <button onClick={() => setDeleting(goal.id)} aria-label={`Excluir meta "${goal.title}"`} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: "var(--muted-foreground)" }}><Trash2 size={13} /></button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between mb-1.5">
                    <span style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "var(--font-mono)", color: "var(--foreground)" }}>{formatCurrency(goal.current)}</span>
                    <span style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>de {formatCurrency(goal.target)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                      className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${goal.color}80, ${goal.color})` }} />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span style={{ color: goal.color, fontSize: "0.75rem", fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                    <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>Falta {formatCurrency(Math.max(0, goal.target - goal.current))}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <div>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Prazo</p>
                    <p style={{ color: "var(--foreground)", fontSize: "0.78rem", fontWeight: 500 }}>
                      {toLocalDate(goal.deadline).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Dias restantes</p>
                    <p style={{ color: daysLeft < 30 ? "var(--red)" : "var(--foreground)", fontSize: "0.78rem", fontWeight: 500 }}>
                      {daysLeft > 0 ? `${daysLeft} dias` : "Vencido"}
                    </p>
                  </div>
                  {monthlyNeeded > 0 && (
                    <div>
                      <p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Aporte/mês</p>
                      <p style={{ color: "var(--foreground)", fontSize: "0.78rem", fontWeight: 500 }}>{formatCurrency(monthlyNeeded)}</p>
                    </div>
                  )}
                </div>

                {!done && (
                  <button onClick={() => setContributing(goal)}
                    className="relative mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90"
                    style={{ background: goal.color }}>
                    <CircleDollarSign size={16} /> Guardar valor
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Meta" maxWidth={460}>
        <GoalForm onAdd={addGoal} onUpdate={updateGoal} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar Meta" maxWidth={460}>
        {editing && (
          <GoalForm initial={editing} onAdd={addGoal} onUpdate={updateGoal} onClose={() => setEditing(null)} />
        )}
      </Modal>

      <Modal open={contributing !== null} onClose={() => setContributing(null)} title="Adicionar valor" maxWidth={460}>
        {contributing && (
          <GoalContributionForm
            goal={contributing}
            categories={categories}
            onSave={(amount, categoryId) => addContribution(contributing, amount, categoryId)}
            onClose={() => setContributing(null)}
          />
        )}
      </Modal>

      <ConfirmDeleteDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteGoal(deleting!)}
        title="Excluir meta?"
        description="Esta ação não pode ser desfeita."
        successMessage="Meta excluída com sucesso!"
        errorLog="Erro ao excluir meta:"
      />
    </div>
  );
}
