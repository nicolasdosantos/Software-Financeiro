import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Wallet } from "lucide-react";

interface AuthCardProps {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, footer, children }: AuthCardProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--background)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div
          className="rounded-3xl p-8"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "var(--primary)" }}
            >
              <Wallet size={28} color="white" />
            </div>

            <h1 className="text-white" style={{ fontSize: "1.8rem", fontWeight: 700 }}>
              {title}
            </h1>

            <p style={{ color: "var(--muted-foreground)", marginTop: "6px" }}>
              {subtitle}
            </p>
          </div>

          {children}

          <div className="mt-6 text-center">{footer}</div>
        </div>
      </motion.div>
    </div>
  );
}
