import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { useFinance, Category } from "../context/FinanceContext";

const ICONS = ["🍽️", "🚗", "🏠", "❤️", "📚", "🎮", "📈", "💼", "💻", "📦", "🛒", "☕", "✈️", "🎵", "🎨", "🐶", "💊", "🎁", "⚽", "📱"];
const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#10b981", "#ec4899", "#10d9a4", "#22c55e", "#6366f1", "#94a3b8", "#f97316", "#06b6d4"];

function CategoryForm({ initial, onSave, onClose }: { initial?: Category; onSave: (c: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    icon: initial?.icon || "📦",
    color: initial?.color || "#8892b0",
    type: initial?.type || "custom" as "default" | "custom",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    onClose();
  }

  const inputStyle = {
    background: "var(--input-background)", border: "1px solid var(--border)", borderRadius: "10px",
    color: "var(--foreground)", padding: "10px 14px", width: "100%", fontSize: "0.875rem", outline: "none",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Nome</label>
        <input style={inputStyle} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da categoria" />
      </div>
      <div>
        <label className="block text-sm mb-2" style={{ color: "var(--muted-foreground)" }}>Ícone</label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map(ic => (
            <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))}
              className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
              style={{ background: form.icon === ic ? "var(--primary)" : "var(--secondary)", border: `2px solid ${form.icon === ic ? "var(--primary)" : "transparent"}` }}>
              {ic}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm mb-2" style={{ color: "var(--muted-foreground)" }}>Cor</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
              className="w-8 h-8 rounded-full transition-transform hover:scale-110"
              style={{ background: c, border: `3px solid ${form.color === c ? "white" : "transparent"}` }} />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
          Cancelar
        </button>
        <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90"
          style={{ background: "var(--primary)" }}>
          {initial ? "Salvar" : "Criar Categoria"}
        </button>
      </div>
    </form>
  );
}

export function Categories() {
  const { categories, transactions, addCategory, updateCategory, deleteCategory } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  function getSpend(catId: string) {
    return transactions.filter(t => t.category === catId && t.type === "expense").reduce((s, t) => s + t.amount, 0);
  }

  const overlayStyle = {
    position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px",
  };
  const dialogStyle = {
    background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "20px",
    padding: "24px", width: "100%", maxWidth: "440px", maxHeight: "90vh", overflowY: "auto" as const,
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-white" style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700 }}>Categorias</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>{categories.length} categorias cadastradas</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 w-full sm:w-auto"
          style={{ background: "var(--primary)" }}>
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((cat, i) => {
          const spend = getSpend(cat.id);
          const txCount = transactions.filter(t => t.category === cat.id).length;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -2 }}
              className="rounded-2xl p-4 relative overflow-hidden group"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(135deg, ${cat.color}08, transparent)` }} />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `${cat.color}20` }}>
                    {cat.icon}
                  </div>
                  <div>
                    <p className="text-white" style={{ fontWeight: 600, fontSize: "0.95rem" }}>{cat.name}</p>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
                      {txCount} transaç{txCount !== 1 ? "ões" : "ão"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditing(cat)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "var(--muted-foreground)" }}>
                    <Edit2 size={14} />
                  </button>
                  {cat.type === "custom" && (
                    <button onClick={() => setDeleting(cat.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: "var(--muted-foreground)" }}>
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
                  <div className="h-full rounded-full" style={{
                    background: cat.color,
                    width: `${Math.min(100, spend > 0 ? 30 + Math.random() * 50 : 0)}%`,
                    transition: "width 1s ease"
                  }} />
                </div>
              </div>
              {cat.type === "default" && (
                <div className="relative mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}>
                    Padrão
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={overlayStyle} onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} style={dialogStyle} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white" style={{ fontWeight: 600 }}>Nova Categoria</h2>
                <button onClick={() => setShowForm(false)} style={{ color: "var(--muted-foreground)" }}><X size={20} /></button>
              </div>
              <CategoryForm onSave={addCategory} onClose={() => setShowForm(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={overlayStyle} onClick={() => setEditing(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} style={dialogStyle} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white" style={{ fontWeight: 600 }}>Editar Categoria</h2>
                <button onClick={() => setEditing(null)} style={{ color: "var(--muted-foreground)" }}><X size={20} /></button>
              </div>
              <CategoryForm initial={editing} onSave={updateCategory} onClose={() => setEditing(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={overlayStyle} onClick={() => setDeleting(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              style={{ ...dialogStyle, width: "360px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
              <p style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🗑️</p>
              <h3 className="text-white mb-2" style={{ fontWeight: 600 }}>Excluir categoria?</h3>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginBottom: "24px" }}>As transações desta categoria não serão excluídas.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleting(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>Cancelar</button>
                <button onClick={() => { deleteCategory(deleting); setDeleting(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "var(--destructive)" }}>Excluir</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
