/**
 * Presets de cor de destaque que o usuário pode escolher em Perfil >
 * Aparência. Cada um substitui em runtime as variáveis CSS que hoje são
 * fixas em azul (--primary, --ring, --sidebar-primary, --sidebar-ring,
 * --chart-1), usadas em botões, item ativo do menu, foco de campos etc.
 *
 * Evita propositalmente tons que já têm significado semântico no app
 * (verde = --success, âmbar = --warning, vermelho = --red/--destructive)
 * pra não confundir "cor de destaque" com "indicador de status".
 */
export interface AccentColor {
  id: string;
  label: string;
  /** Hex usado em --primary, --ring, --sidebar-primary, --sidebar-ring, --chart-1. */
  hex: string;
  /** Mesma cor em "r, g, b" pra montar rgba(var(--primary-rgb), alpha). */
  rgb: string;
}

export const ACCENT_COLORS: AccentColor[] = [
  { id: "blue", label: "Azul", hex: "#204bca", rgb: "32, 75, 202" },
  { id: "violet", label: "Violeta", hex: "#7c3aed", rgb: "124, 58, 237" },
  { id: "pink", label: "Rosa", hex: "#db2777", rgb: "219, 39, 119" },
  { id: "cyan", label: "Ciano", hex: "#0891b2", rgb: "8, 145, 178" },
];

export const DEFAULT_ACCENT_COLOR_ID = "blue";

export function getAccentColor(id: string | undefined | null): AccentColor {
  return ACCENT_COLORS.find((c) => c.id === id) ?? ACCENT_COLORS[0];
}

/** Aplica a cor de destaque como variáveis CSS no elemento raiz do documento. */
export function applyAccentColor(id: string | undefined | null) {
  const color = getAccentColor(id);
  const root = document.documentElement.style;
  root.setProperty("--primary", color.hex);
  root.setProperty("--primary-rgb", color.rgb);
  root.setProperty("--ring", color.hex);
  root.setProperty("--sidebar-primary", color.hex);
  root.setProperty("--sidebar-ring", color.hex);
  root.setProperty("--chart-1", color.hex);
}
