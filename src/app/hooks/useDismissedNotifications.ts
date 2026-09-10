import { useCallback, useEffect, useState } from "react";

/**
 * IDs de notificação que o usuário já dispensou no sininho, persistidos por
 * conta no localStorage. Como o `id` de cada notificação já carrega o mês,
 * a semana ou a faixa (near/over) que a gerou (ver useNotifications), essa
 * lista se "autolimpa": só guardamos os ids que ainda estão entre os
 * atualmente ativos, então dispensar não acumula lixo indefinidamente nem
 * silencia um aviso novo (mês seguinte, faixa mais grave etc).
 */
export function useDismissedNotifications(userId: string | undefined, activeIds: string[]) {
  const storageKey = userId ? `notif-dismissed-${userId}` : null;
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (!storageKey) {
      setDismissed([]);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      setDismissed(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setDismissed([]);
    }
  }, [storageKey]);

  const dismiss = useCallback((id: string) => {
    if (!storageKey) return;
    setDismissed((prev) => {
      const next = [...new Set([...prev.filter((existing) => activeIds.includes(existing)), id])];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // localStorage indisponível (modo privado, cota cheia etc.) — a
        // notificação só reaparece na próxima visita, sem quebrar a tela.
      }
      return next;
    });
  }, [storageKey, activeIds]);

  return { dismissed, dismiss };
}
