import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // Não usa bg-accent (padrão do shadcn): nesse tema --accent é um azul
      // saturado usado em estados ativos, não a cor neutra que um esqueleto
      // de carregamento precisa. var(--secondary) é o mesmo tom já usado
      // como fundo de inputs/painéis no resto do app.
      className={cn("animate-pulse rounded-md", className)}
      style={{ background: "var(--secondary)" }}
      {...props}
    />
  );
}

export { Skeleton };
