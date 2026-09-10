import { useId } from "react";
import { Palette } from "lucide-react";

interface ColorPickerProps {
  value: string;
  presets: string[];
  onChange: (color: string) => void;
}

/**
 * Paleta de cores prontas + uma opção de cor livre (input nativo type="color",
 * que abre o seletor do próprio sistema operacional). Antes, Categorias e
 * Metas só deixavam escolher entre um punhado fixo de cores — quem queria
 * uma cor específica (a mesma do logo da empresa, por exemplo) simplesmente
 * não conseguia. O círculo de cor livre mostra a cor atual quando ela não é
 * uma das prontas, então escolher uma cor customizada continua visível como
 * "selecionada" mesmo depois de fechar e reabrir o formulário.
 */
export function ColorPicker({ value, presets, onChange }: ColorPickerProps) {
  const inputId = useId();
  const isCustom = !presets.includes(value);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Cor ${c}`}
          aria-pressed={value === c}
          className="w-8 h-8 rounded-full transition-transform hover:scale-110"
          style={{ background: c, border: `3px solid ${value === c ? "white" : "transparent"}` }}
        />
      ))}
      <label
        htmlFor={inputId}
        title="Escolher outra cor"
        aria-label={isCustom ? `Cor personalizada ${value}, selecionada` : "Escolher outra cor"}
        className="relative w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shrink-0"
        style={{
          background: isCustom ? value : "conic-gradient(from 0deg, #f59e0b, #22c55e, #3b82f6, #8b5cf6, #ec4899, #f59e0b)",
          border: `3px solid ${isCustom ? "white" : "transparent"}`,
        }}
      >
        {!isCustom && <Palette size={13} className="text-white pointer-events-none" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.4))" }} />}
        <input
          id={inputId}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
    </div>
  );
}
