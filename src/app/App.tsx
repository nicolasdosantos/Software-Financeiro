import { BrowserRouter, Routes, Route } from "react-router-dom";

import { FinanceProvider } from "./context/FinanceContext";

import MainLayout from "./layouts/MainLayout";

import { Login } from "./pages/Login";
import { Register } from "./pages/Cadastro";

import { Dashboard } from "./components/Dashboard";
import { Transactions } from "./components/Transactions";
import { Monthly } from "./components/Monthly";
import { Categories } from "./components/Categories";
import { Charts } from "./components/Charts";
import { Goals } from "./components/Goals";
import { Planning } from "./components/Planning";
import { Investments } from "./components/Investments";
import { Profile } from "./components/Profile";
import { Reports } from "./components/Reports";

import { ProtectedRoute } from "../routes/ProtectedRoute";

export default function App() {
  return (
    <FinanceProvider>
      <BrowserRouter>
        <Routes>

          {/* =========================
              ROTAS PÚBLICAS
          ========================= */}
          <Route path="/" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />

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
      </BrowserRouter>
    </FinanceProvider>
  );
}