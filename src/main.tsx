
  import { createRoot } from "react-dom/client";
  import { MotionConfig } from "motion/react";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    // reducedMotion="user" respeita o prefers-reduced-motion do sistema
    // operacional automaticamente em todas as animações do Motion no app,
    // sem precisar tocar em cada componente individualmente.
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  );
