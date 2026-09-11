import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

// Tempo que o usuário tem pra clicar em "Desfazer" antes da exclusão de
// verdade acontecer no banco.
const UNDO_WINDOW_MS = 5000;

/**
 * Rede de segurança contra exclusão acidental: em vez de apagar na hora,
 * o item só some da lista (o componente que chama filtra pelo `pendingIds`
 * retornado aqui) e a exclusão de verdade no banco só acontece alguns
 * segundos depois — dá tempo de clicar em "Desfazer" no toast antes disso
 * de fato acontecer. Se a pessoa navegar pra outra tela nesse meio tempo, a
 * exclusão adiada continua agendada e acontece normalmente (não é cancelada
 * só por sair da tela).
 *
 * `deleteFn` é a função que realmente exclui (ex: deleteTransaction do
 * FinanceContext) — ela já cuida sozinha do toast de erro em caso de falha,
 * então esse hook não precisa tratar isso.
 */
export function useUndoableDelete(deleteFn: (id: string) => Promise<void>) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const requestDelete = useCallback((id: string, message: string) => {
    setPendingIds((prev) => new Set(prev).add(id));

    const timer = setTimeout(() => {
      timers.current.delete(id);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      deleteFn(id).catch(() => {
        // deleteFn já mostra o próprio toast de erro — nada mais a fazer
        // aqui além de não deixar a rejeição da Promise subir sem tratamento.
      });
    }, UNDO_WINDOW_MS);

    timers.current.set(id, timer);

    toast.success(message, {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Desfazer",
        onClick: () => {
          const pendingTimer = timers.current.get(id);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            timers.current.delete(id);
          }
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      },
    });
  }, [deleteFn]);

  return { pendingIds, requestDelete };
}
