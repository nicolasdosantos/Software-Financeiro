import type { ReactNode } from "react";
import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

const overlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  padding: "16px",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: number;
  children: ReactNode;
}

export function Modal({ open, onClose, title, maxWidth = 480, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const dialogStyle = {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    padding: "24px",
    width: "100%",
    maxWidth,
    maxHeight: "90vh",
    overflowY: "auto" as const,
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={overlayStyle} onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            style={dialogStyle} onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label={title}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white" style={{ fontWeight: 600 }}>{title}</h2>
              <button onClick={onClose} aria-label="Fechar" style={{ color: "var(--muted-foreground)" }}>
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
