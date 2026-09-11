import { Bell, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import type { AppNotification } from "../hooks/useNotifications";

const KIND_STYLE: Record<string, string> = {
  budgetAlert: "border-l-[var(--warning)]",
  goalUpdate: "border-l-[var(--success)]",
  weeklyReport: "border-l-[var(--primary)]",
  monthlyBalance: "border-l-[var(--primary)]",
};

interface NotificationsBellProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

/**
 * Sino de notificações reais: calculadas na hora a partir dos dados do
 * usuário (orçamento, metas, transações), não enviadas por e-mail/push —
 * o app não tem esse tipo de infraestrutura, então preferimos mostrar algo
 * genuíno aqui dentro a fingir um envio que não acontece. Preferências em
 * Perfil > Notificações continuam controlando o que aparece. A lista já vem
 * pronta do MainLayout (que também alimenta o badge do sino na Sidebar com
 * a mesma contagem), pra não recalcular tudo duas vezes.
 */
export function NotificationsBell({ notifications, onDismiss }: NotificationsBellProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={notifications.length > 0 ? `Notificações (${notifications.length} não vistas)` : "Notificações"}
          className="relative rounded-xl"
          style={{ background: "var(--secondary)", color: "var(--foreground)" }}
        >
          <Bell size={18} />
          {notifications.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1.5 -right-1.5 h-4.5 min-w-4.5 px-1 justify-center rounded-full text-[0.65rem]"
            >
              {notifications.length > 9 ? "9+" : notifications.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0 max-h-[70vh] overflow-y-auto">
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>Notificações</p>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
            Calculadas a partir dos seus dados — nada é enviado por e-mail.
          </p>
        </div>
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
            Nenhuma notificação por aqui no momento.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`px-4 py-3 flex items-start gap-2 border-l-4 ${KIND_STYLE[n.kind] ?? ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: "0.8rem", fontWeight: 600 }}>{n.title}</p>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{n.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(n.id)}
                  aria-label={`Dispensar notificação "${n.title}"`}
                  className="shrink-0 p-1 rounded-md hover:opacity-80"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
