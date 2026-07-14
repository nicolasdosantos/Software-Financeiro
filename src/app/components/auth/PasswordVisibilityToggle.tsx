import { Eye, EyeOff } from "lucide-react";

interface PasswordVisibilityToggleProps {
  visible: boolean;
  onToggle: () => void;
}

export function PasswordVisibilityToggle({ visible, onToggle }: PasswordVisibilityToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2"
    >
      {visible ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
    </button>
  );
}
