import { useState } from "react";
import { Input } from "../ui/input";

interface IconPickerProps {
  value: string;
  presets: string[];
  onChange: (icon: string) => void;
}

/**
 * Detecta se `str` é exatamente UM emoji — não duas letras, não um emoji
 * seguido de texto, não uma string vazia. Emoji "reais" muitas vezes são
 * mais de um code point (bandeiras, tons de pele, sequências com ZWJ como
 * 👨‍👩‍👧), então contar caracteres não basta: usamos Intl.Segmenter pra
 * quebrar em "grapheme clusters" (o jeito certo de contar "quantos emojis
 * tem aqui" do ponto de vista de quem está olhando pra tela) e depois
 * confirmamos que esse único cluster é mesmo um emoji, não uma letra comum.
 */
function isSingleEmoji(str: string): boolean {
  if (!str) return false;
  try {
    const segments = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(str)];
    if (segments.length !== 1) return false;
    return /\p{Extended_Pictographic}/u.test(segments[0].segment);
  } catch {
    // Intl.Segmenter pode faltar em navegadores bem antigos — nesse caso,
    // aceita qualquer entrada de até 2 code points que pareça emoji, em vez
    // de travar o formulário por causa de uma checagem extra.
    return str.length <= 4 && /\p{Extended_Pictographic}/u.test(str);
  }
}

/**
 * Ícones prontos + a opção de colar/digitar QUALQUER emoji — a pessoa não
 * fica presa a um punhado de opções escolhidas por nós. Só aceita um emoji
 * por vez (não texto, não vários emojis colados), pra continuar cabendo no
 * mesmo espaço visual dos ícones prontos.
 */
export function IconPicker({ value, presets, onChange }: IconPickerProps) {
  const isCustom = Boolean(value) && !presets.includes(value);
  const [draft, setDraft] = useState(isCustom ? value : "");
  const [invalid, setInvalid] = useState(false);

  function handleDraftChange(next: string) {
    setDraft(next);
    if (!next) {
      setInvalid(false);
      return;
    }
    if (isSingleEmoji(next)) {
      onChange(next);
      setInvalid(false);
    } else {
      setInvalid(true);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {presets.map((ic) => (
          <button
            key={ic}
            type="button"
            onClick={() => { onChange(ic); setDraft(""); setInvalid(false); }}
            aria-label={`Ícone ${ic}`}
            aria-pressed={value === ic}
            className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
            style={{ background: value === ic ? "var(--primary)" : "var(--secondary)", border: `2px solid ${value === ic ? "var(--primary)" : "transparent"}` }}
          >
            {ic}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          placeholder="🙂"
          aria-label="Colar ou digitar um emoji personalizado"
          aria-invalid={invalid}
          maxLength={8}
          className="w-16 h-10 text-center text-xl"
        />
        <span style={{ color: invalid ? "var(--red)" : "var(--muted-foreground)", fontSize: "0.75rem" }}>
          {invalid ? "Cole só um emoji." : "Ou cole seu próprio emoji"}
        </span>
      </div>
    </div>
  );
}
