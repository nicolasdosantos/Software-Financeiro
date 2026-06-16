import { useState } from "react";
import { motion } from "motion/react";
import { User, Shield, Bell, Save, CheckCircle } from "lucide-react";

export function Profile() {
  const [profile, setProfile] = useState({
    name: "João Silva", email: "joao.silva@email.com",
    phone: "(11) 99999-0000", city: "São Paulo, SP",
    occupation: "Desenvolvedor de Software",
  });
  const [notifications, setNotifications] = useState({
    budgetAlert: true, weeklyReport: true, goalUpdate: false, monthlyBalance: true,
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inp = {
    background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "10px",
    color: "var(--foreground)", padding: "10px 14px", width: "100%", fontSize: "0.875rem", outline: "none",
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-2xl">
      <div>
        <h1 className="text-white" style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700 }}>Perfil</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Gerencie suas informações pessoais e preferências</p>
      </div>

      {/* Avatar card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 sm:p-5 flex items-center gap-4"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="relative shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-bold"
            style={{ background: "linear-gradient(135deg, var(--primary), #7b9cff)", fontSize: "clamp(1.5rem,5vw,2rem)" }}>
            J
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center"
            style={{ background: "#10d9a4" }}>
            <CheckCircle size={12} className="text-white" />
          </div>
        </div>
        <div>
          <h2 className="text-white" style={{ fontWeight: 700, fontSize: "clamp(0.95rem,3vw,1.1rem)" }}>{profile.name}</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>{profile.occupation}</p>
          <p style={{ color: "var(--primary)", fontSize: "0.78rem", marginTop: "4px" }}>Membro desde Janeiro 2025</p>
        </div>
      </motion.div>

      {/* Personal info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <User size={16} style={{ color: "var(--primary)" }} />
          <h3 className="text-white" style={{ fontWeight: 600 }}>Dados Pessoais</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Nome completo</label>
            <input style={inp} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Profissão</label>
            <input style={inp} value={profile.occupation} onChange={e => setProfile(p => ({ ...p, occupation: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>E-mail</label>
            <input style={inp} type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Telefone</label>
            <input style={inp} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Cidade</label>
            <input style={inp} value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} />
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} style={{ color: "var(--primary)" }} />
          <h3 className="text-white" style={{ fontWeight: 600 }}>Notificações</h3>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {[
            { key: "budgetAlert", label: "Alertas de orçamento", desc: "Quando uma categoria atingir 80% do limite" },
            { key: "weeklyReport", label: "Relatório semanal", desc: "Resumo financeiro toda segunda-feira" },
            { key: "goalUpdate", label: "Atualização de metas", desc: "Notificar quando uma meta for atingida" },
            { key: "monthlyBalance", label: "Balanço mensal", desc: "Resumo completo ao final de cada mês" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2.5 px-3 sm:px-4 rounded-xl gap-3"
              style={{ background: "var(--secondary)" }}>
              <div className="min-w-0">
                <p className="text-white" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{item.label}</p>
                <p className="hidden sm:block" style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{item.desc}</p>
              </div>
              <button
                onClick={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                className="relative w-12 h-6 rounded-full transition-colors shrink-0"
                style={{ background: notifications[item.key as keyof typeof notifications] ? "var(--primary)" : "rgba(255,255,255,0.1)" }}
              >
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: notifications[item.key as keyof typeof notifications] ? "28px" : "4px" }} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
        className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} style={{ color: "var(--primary)" }} />
          <h3 className="text-white" style={{ fontWeight: 600 }}>Segurança</h3>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {[
            { label: "Alterar senha", desc: "Última alteração: há 3 meses", action: "Alterar" },
            { label: "Autenticação em 2 fatores", desc: "Adicione uma camada extra de segurança", action: "Ativar" },
            { label: "Sessões ativas", desc: "1 dispositivo conectado", action: "Gerenciar" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2.5 px-3 sm:px-4 rounded-xl gap-3"
              style={{ background: "var(--secondary)" }}>
              <div className="min-w-0">
                <p className="text-white" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{item.label}</p>
                <p className="hidden sm:block" style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{item.desc}</p>
              </div>
              <button className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: "rgba(32,75,202,0.15)", color: "var(--primary)", border: "1px solid rgba(32,75,202,0.3)", whiteSpace: "nowrap" }}>
                {item.action}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium w-full sm:w-auto justify-center sm:justify-start"
        style={{ background: saved ? "#10d9a4" : "var(--primary)" }}>
        {saved ? <CheckCircle size={16} /> : <Save size={16} />}
        {saved ? "Salvo com sucesso!" : "Salvar Alterações"}
      </motion.button>
    </div>
  );
}
