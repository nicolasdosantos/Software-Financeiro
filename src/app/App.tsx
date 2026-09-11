import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { FinanceProvider } from "./context/FinanceContext";
import { AccentColorEffect } from "./components/AccentColorEffect";
import { ThemeEffect } from "./components/ThemeEffect";
import { ThemedToaster } from "./components/ThemedToaster";

import MainLayout from "./layouts/MainLayout";

import { ProtectedRoute } from "../routes/ProtectedRoute";

// Code-splitting por rota: cada página vira seu próprio chunk, baixado só
// quando o usuário navega até ela, em vez de tudo (Recharts dos gráficos,
// o wizard de importação, etc.) entrar no bundle inicial. As páginas usam
// export nomeado (não default), daí o .then(m => ({ default: m.X })) —
// React.lazy() exige um módulo com export default.
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Cadastro = lazy(() => import("./pages/Cadastro").then((m) => ({ default: m.Cadastro })));

const Dashboard = lazy(() => import("./components/Dashboard").then((m) => ({ default: m.Dashboard })));
const Transactions = lazy(() => import("./components/Transactions").then((m) => ({ default: m.Transactions })));
const Monthly = lazy(() => import("./components/Monthly").then((m) => ({ default: m.Monthly })));
const Categories = lazy(() => import("./components/Categories").then((m) => ({ default: m.Categories })));
const Charts = lazy(() => import("./components/Charts").then((m) => ({ default: m.Charts })));
const Goals = lazy(() => import("./components/Goals").then((m) => ({ default: m.Goals })));
const Planning = lazy(() => import("./components/Planning").then((m) => ({ default: m.Planning })));
const Investments = lazy(() => import("./components/Investments").then((m) => ({ default: m.Investments })));
const Profile = lazy(() => import("./components/Profile").then((m) => ({ default: m.Profile })));
const Reports = lazy(() => import("./components/Reports").then((m) => ({ default: m.Reports })));

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        color: "var(--muted-foreground)",
        fontSize: "0.875rem",
      }}
    >
      Carregando...
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AccentColorEffect />
      <ThemeEffect />
      <FinanceProvider>
        <ThemedToaster />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>

              {/* =========================
                  ROTAS PÚBLICAS
              ========================= */}
              <Route path="/" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />

              {/* =========================
                  ROTAS PROTEGIDAS
              ========================= */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/home" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/transacoes" element={<Transactions />} />
                  <Route path="/mensal" element={<Monthly />} />
                  <Route path="/categorias" element={<Categories />} />
                  <Route path="/graficos" element={<Charts />} />
                  <Route path="/metas" element={<Goals />} />
                  <Route path="/planejamento" element={<Planning />} />
                  <Route path="/investimentos" element={<Investments />} />
                  <Route path="/perfil" element={<Profile />} />
                  <Route path="/relatorios" element={<Reports />} />
                </Route>
              </Route>

            </Routes>
          </Suspense>
        </BrowserRouter>
      </FinanceProvider>
    </AuthProvider>
  );
}
