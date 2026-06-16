import { useState } from "react";
import { motion } from "motion/react";
import { Download, CheckCircle } from "lucide-react";
import { useFinance, formatCurrency } from "../context/FinanceContext";

export function Reports() {
  const { transactions, categories } = useFinance();
  const [generating, setGenerating] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  function simulateGenerate(id: string) {
    setGenerating(id);
    setTimeout(() => {
      setGenerating(null);
      setDone(prev => [...prev, id]);
      setTimeout(() => setDone(prev => prev.filter(x => x !== id)), 3000);
    }, 1800);
  }

  const months = Array.from(new Set(transactions.map(t => t.date.slice(0, 7)))).sort().reverse();

  function getMonthStats(month: string) {
    const txs = transactions.filter(t => t.date.startsWith(month));
    const income = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { count: txs.length, income, expense, balance: income - expense };
  }

  const reportTypes = [
    { id: "monthly-pdf", icon: "📄", label: "Extrato Mensal (PDF)", desc: "Relatório completo com todas as transações", format: "PDF", color: "#ef4444" },
    { id: "full-excel", icon: "📊", label: "Exportar para Excel", desc: "Todas as transações em planilha organizada", format: "XLSX", color: "#10d9a4" },
    { id: "category-report", icon: "🏷️", label: "Relatório por Categoria", desc: "Análise detalhada de gastos por categoria", format: "PDF", color: "#8b5cf6" },
    { id: "goal-report", icon: "🎯", label: "Relatório de Metas", desc: "Progresso de todas as metas financeiras", format: "PDF", color: "#f59e0b" },
    { id: "investment-report", icon: "📈", label: "Relatório de Investimentos", desc: "Portfólio com rentabilidade e evolução", format: "PDF", color: "#204bca" },
    { id: "annual-report", icon: "🗓️", label: "Balanço Anual 2026", desc: "Resumo financeiro completo do ano", format: "PDF", color: "#ec4899" },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-white" style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700 }}>Central de Relatórios</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Gere e exporte relatórios financeiros detalhados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {[
          { label: "Transações", value: transactions.length.toString(), icon: "💳" },
          { label: "Meses", value: months.length.toString(), icon: "📅" },
          { label: "Categorias", value: categories.length.toString(), icon: "🏷️" },
          { label: "Relatórios", value: reportTypes.length.toString(), icon: "📋" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="rounded-2xl p-3 sm:p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: "1rem" }}>{card.icon}</span>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{card.label}</p>
            </div>
            <p className="text-white" style={{ fontWeight: 700, fontSize: "clamp(1.2rem,4vw,1.5rem)" }}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Report types */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-white mb-4" style={{ fontWeight: 600 }}>Gerar Relatórios</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {reportTypes.map(report => {
            const isGenerating = generating === report.id;
            const isDone = done.includes(report.id);
            return (
              <motion.div key={report.id} whileHover={{ y: -2 }}
                className="p-3 sm:p-4 rounded-xl flex items-center gap-3"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: `${report.color}20` }}>
                  {report.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white" style={{ fontWeight: 500, fontSize: "0.875rem" }}>{report.label}</p>
                  <p className="hidden sm:block truncate" style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{report.desc}</p>
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-xs"
                    style={{ background: `${report.color}20`, color: report.color }}>{report.format}</span>
                </div>
                <button onClick={() => simulateGenerate(report.id)} disabled={isGenerating}
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: isDone ? "#10d9a4" : `${report.color}20`, color: isDone ? "#fff" : report.color, border: `1px solid ${isDone ? "#10d9a4" : report.color + "40"}` }}>
                  {isGenerating
                    ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent" style={{ animation: "spin 0.8s linear infinite" }} />
                    : isDone ? <CheckCircle size={16} /> : <Download size={16} />}
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Monthly history */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
        className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="p-4 sm:p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-white" style={{ fontWeight: 600 }}>Histórico por Mês</h3>
        </div>

        {/* Mobile cards */}
        <div className="block sm:hidden divide-y" style={{ borderColor: "var(--border)" }}>
          {months.map(m => {
            const stats = getMonthStats(m);
            const monthId = `month-${m}`;
            return (
              <div key={m} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white" style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                    {new Date(m + "-01").toLocaleString("pt-BR", { month: "long", year: "numeric" })}
                  </p>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{stats.count} transações</p>
                  <p style={{ color: stats.balance >= 0 ? "#10d9a4" : "#ef4444", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, marginTop: "2px" }}>
                    {stats.balance >= 0 ? "+" : ""}{formatCurrency(stats.balance)}
                  </p>
                </div>
                <button onClick={() => simulateGenerate(monthId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm shrink-0"
                  style={{ background: done.includes(monthId) ? "rgba(16,217,164,0.15)" : "rgba(32,75,202,0.15)", color: done.includes(monthId) ? "#10d9a4" : "var(--primary)" }}>
                  {generating === monthId
                    ? <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent" style={{ animation: "spin 0.8s linear infinite" }} />
                    : done.includes(monthId) ? <CheckCircle size={13} /> : <Download size={13} />}
                  <span className="hidden xs:inline">{done.includes(monthId) ? "Baixado" : "Exportar"}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Mês", "Transações", "Receitas", "Despesas", "Saldo", "Ações"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map(m => {
                const stats = getMonthStats(m);
                const monthId = `month-${m}`;
                return (
                  <tr key={m} style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--secondary)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="text-white" style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                        {new Date(m + "-01").toLocaleString("pt-BR", { month: "long", year: "numeric" })}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: "0.8rem" }}>{stats.count}</td>
                    <td style={{ padding: "12px 16px", color: "#10d9a4", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 500 }}>
                      +{formatCurrency(stats.income)}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#ef4444", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 500 }}>
                      -{formatCurrency(stats.expense)}
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, color: stats.balance >= 0 ? "#10d9a4" : "#ef4444" }}>
                      {stats.balance >= 0 ? "+" : ""}{formatCurrency(stats.balance)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button onClick={() => simulateGenerate(monthId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
                        style={{ background: done.includes(monthId) ? "rgba(16,217,164,0.15)" : "rgba(32,75,202,0.15)", color: done.includes(monthId) ? "#10d9a4" : "var(--primary)" }}>
                        {generating === monthId
                          ? <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent" style={{ animation: "spin 0.8s linear infinite" }} />
                          : done.includes(monthId) ? <CheckCircle size={13} /> : <Download size={13} />}
                        {done.includes(monthId) ? "Baixado" : "Exportar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
