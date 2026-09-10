import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "motion/react";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { useFinance, getCategorySpend } from "../context/FinanceContext";
import type { Category } from "../context/FinanceContext";
import { Modal } from "./shared/Modal";
import { ConfirmDeleteDialog } from "./shared/ConfirmDeleteDialog";
import { ColorPicker } from "./shared/ColorPicker";
import { IconPicker } from "./shared/IconPicker";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const MotionButton = motion.create(Button);

function CategoriesSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-3.5 w-44" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

const ICONS = ["🍽️", "🚗", "🏠", "❤️", "📚", "🎮", "📈", "💼", "💻", "📦", "🛒", "☕", "✈️", "🎵", "🎨", "🐶", "💊", "🎁", "⚽", "📱"];
const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#10b981", "#ec4899", "#10d9a4", "#22c55e", "#6366f1", "#94a3b8", "#f97316", "#06b6d4"];

interface CategoryFormProps {
  initial?: Category;
  onAdd: (c: Omit<Category, "id">) => Promise<void>;
  onUpdate: (c: Category) => Promise<void>;
  onClose: () => void;
}

function CategoryForm({ initial, onAdd, onUpdate, onClose }: CategoryFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    icon: initial?.icon || "📦",
    color: initial?.color || "#8892b0",
    type: initial?.type || "custom" as "default" | "custom",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (initial) await onUpdate({ ...form, id: initial.id });
      else await onAdd(form);
      toast.success(initial ? "Categoria atualizada com sucesso!" : "Categoria criada com sucesso!");
      onClose();
    } catch (err) {
      console.error("Erro ao salvar categoria:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">Nome</Label>
        <Input id="cat-name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da categoria" />
      </div>
      <div>
        <label className="block text-sm mb-2" style={{ color: "var(--muted-foreground)" }}>Ícone</label>
        <IconPicker value={form.icon} presets={ICONS} onChange={(ic) => setForm(f => ({ ...f, icon: ic }))} />
      </div>
      <div>
        <label className="block text-sm mb-2" style={{ color: "var(--muted-foreground)" }}>Cor</label>
        <ColorPicker value={form.color} presets={COLORS} onChange={(c) => setForm(f => ({ ...f, color: c }))} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? "Salvando..." : initial ? "Salvar" : "Criar Categoria"}
        </Button>
      </div>
    </form>
  );
}

export function Categories() {
  const { categories, transactions, addCategory, updateCategory, deleteCategory, loading } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (loading) return <CategoriesSkeleton />;

  function getSpend(catId: string) {
    return getCategorySpend(transactions, catId);
  }

  const maxSpend = Math.max(0, ...categories.map(cat => getSpend(cat.id)));

  return (
    <div className="space-y-4 sm:space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(var(--primary-rgb),0.14)" }}>
            <Tag size={18} style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700, color: "var(--foreground)" }}>Categorias</h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>{categories.length} categorias cadastradas</p>
          </div>
        </div>
        <MotionButton
          whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto">
          <Plus size={16} /> Nova Categoria
        </MotionButton>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {categories.map((cat, i) => {
          const spend = getSpend(cat.id);
          const txCount = transactions.filter(t => t.category === cat.id).length;
          const pct = maxSpend > 0 ? (spend / maxSpend) * 100 : 0;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl p-4 relative overflow-hidden group"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(135deg, ${cat.color}0c, transparent)` }} />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: 3 }}
                    transition={{ type: "spring", stiffness: 350, damping: 15 }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: `${cat.color}20` }}>
                    {cat.icon}
                  </motion.div>
                  <div className="min-w-0">
                    <p className="truncate" style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--foreground)" }}>{cat.name}</p>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
                      {txCount} transaç{txCount !== 1 ? "ões" : "ão"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                  <button onClick={() => setEditing(cat)} aria-label={`Editar categoria "${cat.name}"`} className="p-1.5 rounded-lg hover:bg-[var(--secondary)]" style={{ color: "var(--muted-foreground)" }}>
                    <Edit2 size={14} />
                  </button>
                  {cat.type === "custom" && (
                    <button onClick={() => setDeleting(cat.id)} aria-label={`Excluir categoria "${cat.name}"`} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: "var(--muted-foreground)" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="relative mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="flex justify-between items-center mb-1.5">
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Total gasto</span>
                  <span style={{ color: cat.color, fontWeight: 600, fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
                    R$ {spend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: cat.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: Math.min(i * 0.04, 0.4) + 0.15, ease: "easeOut" }}
                  />
                </div>
              </div>
              {cat.type === "default" && (
                <div className="relative mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
                    Padrão
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Categoria" maxWidth={440}>
        <CategoryForm onAdd={addCategory} onUpdate={updateCategory} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar Categoria" maxWidth={440}>
        {editing && (
          <CategoryForm initial={editing} onAdd={addCategory} onUpdate={updateCategory} onClose={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDeleteDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteCategory(deleting!)}
        title="Excluir categoria?"
        description="As transações desta categoria não serão excluídas."
        successMessage="Categoria excluída com sucesso!"
        errorLog="Erro ao excluir categoria:"
      />
    </div>
  );
}
