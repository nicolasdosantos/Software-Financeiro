import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface AuthFieldProps {
  label: string;
  icon: LucideIcon;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  rightSlot?: ReactNode;
}

const fieldStyle = {
  background: "var(--input-background)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
};

export function AuthField({
  label,
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  rightSlot,
}: AuthFieldProps) {
  return (
    <div>
      <label className="block mb-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </label>

      <div className="relative">
        <Icon
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--muted-foreground)" }}
        />

        <input
          type={type}
          placeholder={placeholder}
          className={`w-full rounded-xl py-3 pl-11 outline-none ${rightSlot ? "pr-12" : "pr-4"}`}
          style={fieldStyle}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />

        {rightSlot}
      </div>
    </div>
  );
}
