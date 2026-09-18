import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, getDistinctMonths, getMonthName, todayMonth, useFinance } from "../context/FinanceContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

/**
 * Seletor de mês global, na navbar — controla o `currentMonth` do
 * FinanceContext, que Dashboard e Planejamento usam diretamente (e Gráficos
 * / Controle Mensal usam como ponto de partida da própria navegação). Trocar
 * o mês aqui é a forma de "ver o site inteiro como se fosse aquele mês".
 *
 * Limitado ao mês de hoje pra frente: não tem gasto nem receita lançados
 * ainda pra um mês futuro, então "planejar" um orçamento pra depois estando
 * em setembro não mostraria nada de útil — só confundiria.
 */
export function MonthSelector() {
  const { transactions, currentMonth, setCurrentMonth } = useFinance();
  const maxMonth = todayMonth();
  const months = getDistinctMonths(transactions, [currentMonth, maxMonth]).filter((m) => m <= maxMonth);
  const isAtMax = currentMonth >= maxMonth;

  function step(delta: number) {
    const next = addMonths(`${currentMonth}-01`, delta).slice(0, 7);
    if (next > maxMonth) return;
    setCurrentMonth(next);
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-xl shrink-0"
      style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
    >
      <button
        onClick={() => step(-1)}
        aria-label="Mês anterior"
        className="p-1 sm:p-1.5 rounded-lg transition-colors hover:text-[var(--foreground)] shrink-0"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ChevronLeft size={14} />
      </button>

      <Select value={currentMonth} onValueChange={setCurrentMonth}>
        <SelectTrigger
          className="h-7 border-0 shadow-none px-1 sm:px-1.5 w-[64px] sm:w-[150px] bg-transparent dark:bg-transparent dark:hover:bg-transparent"
          style={{ color: "var(--foreground)", fontSize: "0.8rem" }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={m}>
              {getMonthName(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        onClick={() => step(1)}
        disabled={isAtMax}
        aria-label="Próximo mês"
        title={isAtMax ? "Este já é o mês atual" : "Próximo mês"}
        className="p-1 sm:p-1.5 rounded-lg transition-colors enabled:hover:text-[var(--foreground)] disabled:cursor-not-allowed shrink-0"
        style={{ color: "var(--muted-foreground)", opacity: isAtMax ? 0.4 : 1 }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
