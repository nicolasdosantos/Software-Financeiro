import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

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

const dialogStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "20px",
  padding: "24px",
  width: "100%",
  maxWidth: "360px",
  textAlign: "center" as const,
};

interface ConfirmDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  successMessage: string;
  errorLog: string;
}

export function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  successMessage,
  errorLog,
}: ConfirmDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  async function handleConfirm() {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
      toast.success(successMessage);
      onClose();
    } catch (err) {
      console.error(errorLog, err);
    } finally {
      setIsDeleting(false);
    }
  }

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
            role="alertdialog" aria-modal="true" aria-label={title}
          >
            <p style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🗑️</p>
            <h3 className="text-white mb-2" style={{ fontWeight: 600 }}>{title}</h3>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginBottom: "24px" }}>
              {description}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: "var(--destructive)", opacity: isDeleting ? 0.7 : 1 }}
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
