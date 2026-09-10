export type ThemeMode = "dark" | "light";

export const DEFAULT_THEME: ThemeMode = "dark";

/**
 * Aplica o modo claro/escuro no elemento raiz do documento via classe CSS
 * (ver .light em src/styles/theme.css) — de propósito uma escolha
 * persistida do usuário, não a preferência do sistema operacional
 * (prefers-color-scheme). "dark" (o padrão) não adiciona nenhuma classe,
 * já que :root já é o tema escuro.
 */
export function applyTheme(mode: ThemeMode | undefined | null) {
  document.documentElement.classList.toggle("light", mode === "light");
}
