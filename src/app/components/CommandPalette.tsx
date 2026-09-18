import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, CalendarDays, Tag, BarChart3,
  Target, PiggyBank, TrendingUp, User, FileText, Search, Plus,
} from "lucide-react";
import { useFinance, formatCurrency, toLocalDate } from "../context/FinanceContext";
import type { TransactionType } from "../context/FinanceContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut } from "./ui/command";

// Mesmas páginas do menu lateral (Sidebar.tsx) — mantido separado de
// propósito: o menu lateral é sobre navegação estrutural (sempre visível,
// mostra "onde estou"), a busca rápida é sobre achar algo rápido sem tirar a
// mão do teclado. Se um dia isso desalinhar, não é grave — só duas fontes de
// verdade que já eram razoavelmente estáveis.
const PAGES = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { path: "/mensal", label: "Controle Mensal", icon: CalendarDays },
  { path: "/categorias", label: "Categorias", icon: Tag },
  { path: "/graficos", label: "Gráficos", icon: BarChart3 },
  { path: "/metas", label: "Metas", icon: Target },
  { path: "/planejamento", label: "Planejamento", icon: PiggyBank },
  { path: "/investimentos", label: "Investimentos", icon: TrendingUp },
  { path: "/relatorios", label: "Relatórios", icon: FileText },
  { path: "/perfil", label: "Perfil", icon: User },
];

// Cada ação abre a página já com o modal de "adicionar" aberto — ver
// useOpenAddFromNav, usado nas 4 telas de destino.
const QUICK_ACTIONS = [
  { path: "/transacoes", label: "Nova Transação", icon: ArrowLeftRight },
  { path: "/categorias", label: "Nova Categoria", icon: Tag },
  { path: "/metas", label: "Nova Meta", icon: Target },
  { path: "/investimentos", label: "Novo Investimento", icon: TrendingUp },
];

const MAX_TX_RESULTS = 6;
const MIN_QUERY_FOR_TRANSACTIONS = 2;

/**
 * Busca rápida global — Ctrl+K/Cmd+K no desktop, ou o botão de lupa na navbar
 * (que também serve de gatilho em telas sem teclado físico, tipo celular).
 * `shouldFilter={false}` no Command porque filtramos na mão: página é filtro
 * simples por nome, transação também precisa de um mínimo de caracteres pra
 * não listar as 138 de uma vez com a busca vazia.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { transactions, categories } = useFinance();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Reabrir do zero é menos confuso que reaparecer com a última busca.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function goToPage(path: string) {
    navigate(path);
    setOpen(false);
  }

  function goToTransaction(description: string) {
    // Sem um "id de transação" pra apontar na URL, a forma mais simples de
    // "levar até ela" é abrir Transações já com o mesmo texto no filtro de
    // busca — Transactions.tsx lê isso do state de navegação.
    navigate("/transacoes", { state: { search: description } });
    setOpen(false);
  }

  function runQuickAction(path: string) {
    navigate(path, { state: { openAdd: true } });
    setOpen(false);
  }

  const q = query.trim().toLowerCase();

  const filteredPages = useMemo(
    () => PAGES.filter((p) => p.label.toLowerCase().includes(q)),
    [q],
  );

  const filteredActions = useMemo(
    () => QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(q)),
    [q],
  );

  // Cada resultado é ou uma transação avulsa, ou uma compra dividida inteira
  // resumida (ícone/categoria principal, total, descrição da compra) — sem
  // isso, uma compra dividida em 3 categorias apareceria como 3 resultados
  // idênticos na busca, um por parte.
  const matchingTransactions = useMemo(() => {
    if (q.length < MIN_QUERY_FOR_TRANSACTIONS) return [];
    // Busca pela descrição da compra E pelo nome de cada item (`notes`) —
    // "Pipoca" precisa achar a compra mesmo que só o nome do item bata.
    const matches = transactions
      .filter((t) => t.description.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date));

    const results: { id: string; description: string; date: string; type: TransactionType; amount: number; icon: string }[] = [];
    const seenGroups = new Set<string>();
    for (const t of matches) {
      if (results.length >= MAX_TX_RESULTS) break;
      if (t.split_group_id) {
        if (seenGroups.has(t.split_group_id)) continue;
        seenGroups.add(t.split_group_id);
        const parts = transactions.filter((p) => p.split_group_id === t.split_group_id);
        const mainCat = categories.find((c) => c.id === t.split_main_category);
        results.push({
          id: t.split_group_id,
          description: t.description,
          date: t.date,
          type: t.type,
          amount: parts.reduce((sum, p) => sum + p.amount, 0),
          icon: mainCat?.icon || "✂️",
        });
      } else {
        const cat = categories.find((c) => c.id === t.category);
        results.push({ id: t.id, description: t.description, date: t.date, type: t.type, amount: t.amount, icon: cat?.icon || "💳" });
      }
    }
    return results;
  }, [transactions, categories, q]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Busca rápida"
        className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 sm:px-3 shrink-0 transition-colors hover:text-[var(--foreground)]"
        style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
      >
        <Search size={15} />
        <span className="hidden md:inline" style={{ fontSize: "0.8rem" }}>Buscar</span>
        <span className="hidden md:inline" style={{ fontSize: "0.68rem", opacity: 0.7 }}>Ctrl+K</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>Busca rápida</DialogTitle>
          <DialogDescription>Navegue entre as páginas ou encontre uma transação pela descrição</DialogDescription>
        </DialogHeader>
        <DialogContent className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Ir para uma página, ou buscar uma transação..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>Nada encontrado.</CommandEmpty>
              {filteredActions.length > 0 && (
                <CommandGroup heading="Ações rápidas">
                  {filteredActions.map((a) => (
                    <CommandItem key={a.path} value={`action-${a.path}`} onSelect={() => runQuickAction(a.path)}>
                      <Plus size={16} />
                      <span>{a.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {filteredPages.length > 0 && (
                <CommandGroup heading="Páginas">
                  {filteredPages.map((p) => (
                    <CommandItem key={p.path} value={p.path} onSelect={() => goToPage(p.path)}>
                      <p.icon size={16} />
                      <span>{p.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {matchingTransactions.length > 0 && (
                <CommandGroup heading="Transações">
                  {matchingTransactions.map((t) => (
                    <CommandItem key={t.id} value={t.id} onSelect={() => goToTransaction(t.description)}>
                      <span>{t.icon}</span>
                      <span className="truncate">{t.description}</span>
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {toLocalDate(t.date).toLocaleDateString("pt-BR")}
                      </span>
                      <CommandShortcut>
                        {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                      </CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {q.length > 0 && q.length < MIN_QUERY_FOR_TRANSACTIONS && filteredPages.length === 0 && (
                <div className="py-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Continue digitando pra buscar transações...
                </div>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
