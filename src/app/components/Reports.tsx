import { useState } from "react";
import { motion } from "motion/react";
import { Download, CheckCircle } from "lucide-react";
import { useFinance, formatCurrency, getMonthName, toLocalDate } from "../context/FinanceContext";

function normalizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function escapeCsv(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildHtmlReport(title: string, subtitle: string, sections: string) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 32px; background: #f6f8fc; color: #141828; font-family: Inter, Arial, sans-serif; }
    .page { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #d9deea; border-radius: 12px; padding: 28px; }
    h1 { margin: 0; font-size: 28px; }
    h2 { margin: 28px 0 10px; font-size: 18px; }
    p { margin: 6px 0; color: #536078; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 22px; }
    .card { border: 1px solid #e3e7f0; border-radius: 10px; padding: 14px; }
    .label { font-size: 12px; color: #667085; }
    .value { margin-top: 4px; font-weight: 700; color: #101828; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th, td { padding: 10px; border-bottom: 1px solid #edf0f6; text-align: left; }
    th { color: #667085; font-weight: 600; background: #f8fafc; }
    .income { color: #067647; font-weight: 700; }
    .expense { color: #b42318; font-weight: 700; }
    .muted { color: #667085; }
    @media print { body { background: #fff; padding: 0; } .page { border: 0; border-radius: 0; } }
  </style>
</head>
<body>
  <main class="page">
    <h1>${title}</h1>
    <p>${subtitle}</p>
    ${sections}
  </main>
</body>
</html>`;
}

export function Reports() {
  const { transactions, categories, goals, investments, currentMonth } = useFinance();
  const [generating, setGenerating] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  const months = Array.from(new Set(transactions.map(t => t.date.slice(0, 7)))).sort().reverse();
  const selectedMonth = months.includes(currentMonth) ? currentMonth : months[0] || currentMonth;

  function markDone(id: string) {
    setDone(prev => [...prev.filter(x => x !== id), id]);
    setTimeout(() => setDone(prev => prev.filter(x => x !== id)), 3000);
  }

  async function generate(id: string) {
    setGenerating(id);
    await new Promise(resolve => setTimeout(resolve, 350));

    if (id === "full-excel") downloadTransactionsCsv();
    else if (id === "category-report") downloadCategoryReport(selectedMonth);
    else if (id === "goal-report") downloadGoalsReport();
    else if (id === "investment-report") downloadInvestmentsReport();
    else if (id === "annual-report") downloadAnnualReport();
    else if (id.startsWith("month-")) downloadMonthlyReport(id.replace("month-", ""));
    else downloadMonthlyReport(selectedMonth);

    setGenerating(null);
    markDone(id);
  }

  function getMonthStats(month: string) {
    const txs = transactions.filter(t => t.date.startsWith(month));
    const income = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { txs, count: txs.length, income, expense, balance: income - expense };
  }

  function getCategoryName(id: string) {
    return categories.find(c => c.id === id)?.name || id;
  }

  function transactionRows(txs = transactions) {
    return txs
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(tx => `
        <tr>
          <td>${toLocalDate(tx.date).toLocaleDateString("pt-BR")}</td>
          <td>${tx.description}</td>
          <td>${getCategoryName(tx.category)}</td>
          <td>${tx.type === "income" ? "Receita" : "Despesa"}</td>
          <td class="${tx.type === "income" ? "income" : "expense"}">${tx.type === "income" ? "+" : "-"}${formatCurrency(tx.amount)}</td>
        </tr>
      `).join("");
  }

  function summaryCards(stats: ReturnType<typeof getMonthStats>) {
    return `
      <div class="summary">
        <div class="card"><div class="label">Transações</div><div class="value">${stats.count}</div></div>
        <div class="card"><div class="label">Receitas</div><div class="value income">${formatCurrency(stats.income)}</div></div>
        <div class="card"><div class="label">Despesas</div><div class="value expense">${formatCurrency(stats.expense)}</div></div>
        <div class="card"><div class="label">Saldo</div><div class="value">${formatCurrency(stats.balance)}</div></div>
      </div>
    `;
  }

  function downloadMonthlyReport(month: string) {
    const stats = getMonthStats(month);
    const html = buildHtmlReport(
      `Extrato mensal - ${getMonthName(month)}`,
      `Gerado em ${new Date().toLocaleDateString("pt-BR")}. Abra este arquivo no navegador para imprimir ou salvar como PDF.`,
      `${summaryCards(stats)}
      <h2>Transações</h2>
      <table>
        <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th></tr></thead>
        <tbody>${transactionRows(stats.txs) || `<tr><td colspan="5" class="muted">Nenhuma transação no período.</td></tr>`}</tbody>
      </table>`
    );

    downloadFile(html, `extrato-${normalizeFileName(getMonthName(month))}.html`, "text/html;charset=utf-8");
  }

  function downloadTransactionsCsv() {
    const header = ["Data", "Descrição", "Categoria", "Tipo", "Valor", "Observações"];
    const rows = transactions
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(tx => [
        toLocalDate(tx.date).toLocaleDateString("pt-BR"),
        tx.description,
        getCategoryName(tx.category),
        tx.type === "income" ? "Receita" : "Despesa",
        tx.type === "income" ? tx.amount : -tx.amount,
        tx.notes || "",
      ].map(escapeCsv).join(";"));

    downloadFile(
      [header.map(escapeCsv).join(";"), ...rows].join("\n"),
      "transacoes-financeiras.csv",
      "text/csv;charset=utf-8"
    );
  }

  function downloadCategoryReport(month: string) {
    const stats = getMonthStats(month);
    const totals = categories
      .map(cat => ({
        name: cat.name,
        total: stats.txs.filter(tx => tx.category === cat.id && tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0),
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);

    const rows = totals.map(item => `
      <tr>
        <td>${item.name}</td>
        <td class="expense">${formatCurrency(item.total)}</td>
        <td>${stats.expense > 0 ? ((item.total / stats.expense) * 100).toFixed(1) : 0}%</td>
      </tr>
    `).join("");

    const html = buildHtmlReport(
      `Relatório por categoria - ${getMonthName(month)}`,
      "Distribuição das despesas por categoria.",
      `${summaryCards(stats)}
      <h2>Categorias</h2>
      <table>
        <thead><tr><th>Categoria</th><th>Total gasto</th><th>Participação</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="3" class="muted">Sem despesas no período.</td></tr>`}</tbody>
      </table>`
    );

    downloadFile(html, `categorias-${normalizeFileName(getMonthName(month))}.html`, "text/html;charset=utf-8");
  }

  function downloadGoalsReport() {
    const rows = goals.map(goal => {
      const pct = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
      return `
        <tr>
          <td>${goal.title}</td>
          <td>${formatCurrency(goal.current)}</td>
          <td>${formatCurrency(goal.target)}</td>
          <td>${pct.toFixed(1)}%</td>
          <td>${toLocalDate(goal.deadline).toLocaleDateString("pt-BR")}</td>
        </tr>
      `;
    }).join("");

    const html = buildHtmlReport(
      "Relatório de metas",
      "Progresso de todas as metas financeiras.",
      `<h2>Metas</h2>
      <table>
        <thead><tr><th>Meta</th><th>Guardado</th><th>Alvo</th><th>Progresso</th><th>Prazo</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" class="muted">Nenhuma meta cadastrada.</td></tr>`}</tbody>
      </table>`
    );

    downloadFile(html, "relatorio-metas.html", "text/html;charset=utf-8");
  }

  function downloadInvestmentsReport() {
    const totalInvested = investments.reduce((sum, item) => sum + item.invested, 0);
    const totalCurrent = investments.reduce((sum, item) => sum + item.currentValue, 0);
    const rows = investments.map(item => {
      const result = item.currentValue - item.invested;
      return `
        <tr>
          <td>${item.name}</td>
          <td>${item.type}</td>
          <td>${item.institution || "-"}</td>
          <td>${formatCurrency(item.invested)}</td>
          <td>${formatCurrency(item.currentValue)}</td>
          <td class="${result >= 0 ? "income" : "expense"}">${formatCurrency(result)}</td>
        </tr>
      `;
    }).join("");

    const html = buildHtmlReport(
      "Relatório de investimentos",
      "Resumo do portfólio e rentabilidade.",
      `<div class="summary">
        <div class="card"><div class="label">Investido</div><div class="value">${formatCurrency(totalInvested)}</div></div>
        <div class="card"><div class="label">Valor atual</div><div class="value">${formatCurrency(totalCurrent)}</div></div>
        <div class="card"><div class="label">Resultado</div><div class="value">${formatCurrency(totalCurrent - totalInvested)}</div></div>
        <div class="card"><div class="label">Ativos</div><div class="value">${investments.length}</div></div>
      </div>
      <h2>Ativos</h2>
      <table>
        <thead><tr><th>Ativo</th><th>Tipo</th><th>Instituição</th><th>Investido</th><th>Atual</th><th>Resultado</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6" class="muted">Nenhum investimento cadastrado.</td></tr>`}</tbody>
      </table>`
    );

    downloadFile(html, "relatorio-investimentos.html", "text/html;charset=utf-8");
  }

  function downloadAnnualReport() {
    const currentYear = selectedMonth.slice(0, 4);
    const yearMonths = months.filter(month => month.startsWith(currentYear));
    const rows = yearMonths.map(month => {
      const stats = getMonthStats(month);
      return `
        <tr>
          <td>${getMonthName(month)}</td>
          <td>${stats.count}</td>
          <td class="income">${formatCurrency(stats.income)}</td>
          <td class="expense">${formatCurrency(stats.expense)}</td>
          <td>${formatCurrency(stats.balance)}</td>
        </tr>
      `;
    }).join("");

    const totals = yearMonths.reduce((acc, month) => {
      const stats = getMonthStats(month);
      return {
        txs: [...acc.txs, ...stats.txs],
        count: acc.count + stats.count,
        income: acc.income + stats.income,
        expense: acc.expense + stats.expense,
        balance: acc.balance + stats.balance,
      };
    }, { txs: [], count: 0, income: 0, expense: 0, balance: 0 } as ReturnType<typeof getMonthStats>);

    const html = buildHtmlReport(
      `Balanço anual ${currentYear}`,
      "Resumo consolidado das finanças no ano.",
      `${summaryCards(totals)}
      <h2>Meses</h2>
      <table>
        <thead><tr><th>Mês</th><th>Transações</th><th>Receitas</th><th>Despesas</th><th>Saldo</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" class="muted">Sem movimentações no ano.</td></tr>`}</tbody>
      </table>`
    );

    downloadFile(html, `balanco-anual-${currentYear}.html`, "text/html;charset=utf-8");
  }

  const reportTypes = [
    { id: "monthly-pdf", icon: "📄", label: "Extrato Mensal", desc: `Relatório completo de ${getMonthName(selectedMonth)}`, format: "HTML", color: "#ef4444" },
    { id: "full-excel", icon: "📊", label: "Exportar para Excel", desc: "Todas as transações em planilha CSV", format: "CSV", color: "#10d9a4" },
    { id: "category-report", icon: "🏷️", label: "Relatório por Categoria", desc: "Análise detalhada de gastos por categoria", format: "HTML", color: "#8b5cf6" },
    { id: "goal-report", icon: "🎯", label: "Relatório de Metas", desc: "Progresso de todas as metas financeiras", format: "HTML", color: "#f59e0b" },
    { id: "investment-report", icon: "📈", label: "Relatório de Investimentos", desc: "Portfólio com rentabilidade e evolução", format: "HTML", color: "#204bca" },
    { id: "annual-report", icon: "🗓️", label: `Balanço Anual ${selectedMonth.slice(0, 4)}`, desc: "Resumo financeiro completo do ano", format: "HTML", color: "#ec4899" },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-white" style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700 }}>Central de Relatórios</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Gere e exporte relatórios financeiros detalhados</p>
      </div>

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
                <button onClick={() => generate(report.id)} disabled={isGenerating || transactions.length === 0}
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
        className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="p-4 sm:p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-white" style={{ fontWeight: 600 }}>Histórico por Mês</h3>
        </div>

        <div className="block sm:hidden divide-y" style={{ borderColor: "var(--border)" }}>
          {months.map(m => {
            const stats = getMonthStats(m);
            const monthId = `month-${m}`;
            return (
              <div key={m} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white" style={{ fontWeight: 500, fontSize: "0.875rem" }}>{getMonthName(m)}</p>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{stats.count} transações</p>
                  <p style={{ color: stats.balance >= 0 ? "#10d9a4" : "#ef4444", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, marginTop: "2px" }}>
                    {stats.balance >= 0 ? "+" : ""}{formatCurrency(stats.balance)}
                  </p>
                </div>
                <button onClick={() => generate(monthId)}
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
                      <span className="text-white" style={{ fontWeight: 500, fontSize: "0.875rem" }}>{getMonthName(m)}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted-foreground)", fontSize: "0.8rem" }}>{stats.count}</td>
                    <td style={{ padding: "12px 16px", color: "#10d9a4", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 500 }}>+{formatCurrency(stats.income)}</td>
                    <td style={{ padding: "12px 16px", color: "#ef4444", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 500 }}>-{formatCurrency(stats.expense)}</td>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 600, color: stats.balance >= 0 ? "#10d9a4" : "#ef4444" }}>
                      {stats.balance >= 0 ? "+" : ""}{formatCurrency(stats.balance)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button onClick={() => generate(monthId)}
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
