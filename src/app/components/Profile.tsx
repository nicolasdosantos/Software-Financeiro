import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Variants } from "motion/react";
import {
  User, Shield, Bell, Save, CheckCircle,
  Mail, Phone, MapPin, Briefcase, KeyRound, LogOut, Sparkles, Palette,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ACCENT_COLORS, DEFAULT_ACCENT_COLOR_ID, applyAccentColor } from "../../lib/accentColors";

export function Profile() {
  const { user: authUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [initialEmail, setInitialEmail] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    occupation: "",
  });

  const [notifications, setNotifications] = useState({
    budgetAlert: true, weeklyReport: true, goalUpdate: false, monthlyBalance: true,
  });
  const [accentColorId, setAccentColorId] = useState(DEFAULT_ACCENT_COLOR_ID);
  const [saved, setSaved] = useState(false);

  async function selectAccentColor(id: string) {
    if (id === accentColorId) return;
    const previous = accentColorId;
    setAccentColorId(id);
    applyAccentColor(id); // aplica na hora, sem esperar o Supabase responder

    try {
      const { error } = await supabase.auth.updateUser({ data: { accentColor: id } });
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao salvar cor de destaque:", err);
      toast.error("Não foi possível salvar a cor de destaque. Tente novamente.");
      setAccentColorId(previous);
      applyAccentColor(previous);
    }
  }

  async function handleSave() {
    if (loading) return;

    if (!profile.name.trim()) {
      toast.error("Informe seu nome.");
      return;
    }

    try {
      setLoading(true);

      const emailChanged = profile.email.trim() !== initialEmail && profile.email.trim() !== "";

      const { error } = await supabase.auth.updateUser({
        ...(emailChanged ? { email: profile.email.trim() } : {}),
        data: {
          name: profile.name,
          phone: profile.phone,
          city: profile.city,
          occupation: profile.occupation,
          notifications,
        },
      });

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      if (emailChanged) {
        toast.info("Confira sua caixa de entrada para confirmar o novo e-mail.");
      } else {
        toast.success("Perfil atualizado com sucesso!");
      }

    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      toast.error("Não foi possível salvar o perfil. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      navigate("/");
    } catch (err) {
      console.error("Erro ao sair:", err);
      toast.error("Não foi possível sair da conta. Tente novamente.");
    }
  };

  async function handleChangePassword() {
    if (changingPassword) return;
    if (!profile.email) {
      toast.error("Não foi possível identificar seu e-mail.");
      return;
    }

    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      toast.success(`Enviamos um link de redefinição de senha para ${profile.email}.`);
    } catch (err) {
      console.error("Erro ao solicitar redefinição de senha:", err);
      toast.error("Não foi possível enviar o e-mail de redefinição de senha.");
    } finally {
      setChangingPassword(false);
    }
  }

  const [focusedField, setFocusedField] = useState<string | null>(null);

  function fieldStyle(name: string) {
    return {
      background: "var(--secondary)",
      border: `1px solid ${focusedField === name ? "var(--primary)" : "var(--border)"}`,
      borderRadius: "10px",
      color: "var(--foreground)",
      padding: "10px 14px 10px 40px",
      width: "100%",
      fontSize: "0.875rem",
      outline: "none",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      boxShadow: focusedField === name ? "0 0 0 3px rgba(var(--primary-rgb),0.15)" : "none",
    } as CSSProperties;
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  };

  useEffect(() => {
    // authUser já vem do AuthProvider compartilhado — sem chamada extra ao
    // Supabase aqui. Depende só de authUser?.id (não do objeto authUser
    // inteiro) de propósito: a sessão é recriada a cada refresh de token
    // (mesmo usuário, novo objeto), e não queremos sobrescrever o que a
    // pessoa está digitando no formulário só por causa disso — só quando
    // troca de usuário (login/logout) é que faz sentido repopular os campos.
    if (!authUser) return;

    setProfile({
      name: authUser.user_metadata?.name || "",
      email: authUser.email || "",
      phone: authUser.user_metadata?.phone || "",
      city: authUser.user_metadata?.city || "",
      occupation: authUser.user_metadata?.occupation || "",
    });
    setInitialEmail(authUser.email || "");
    if (authUser.created_at) {
      const created = new Date(authUser.created_at);
      setMemberSince(created.toLocaleString("pt-BR", { month: "long", year: "numeric" }));
    }

    if (authUser.user_metadata?.notifications) {
      setNotifications((prev) => ({ ...prev, ...authUser.user_metadata.notifications }));
    }
    setAccentColorId(authUser.user_metadata?.accentColor || DEFAULT_ACCENT_COLOR_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center"
    >
      <div className="space-y-4 sm:space-y-5 max-w-2xl w-full">

        <motion.div variants={itemVariants} className="text-left">
          <h1 className="text-white" style={{ fontSize: "clamp(1.2rem,4vw,1.5rem)", fontWeight: 700 }}>Perfil</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Gerencie suas informações pessoais e preferências</p>
        </motion.div>

        {/* Hero / cover card */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl overflow-hidden relative"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          {/* Cover with animated gradient mesh */}
          <div className="relative h-20 sm:h-24 overflow-hidden" style={{ background: "linear-gradient(120deg, rgba(var(--primary-rgb),0.7), var(--primary) 45%, #6d28d9 100%)" }}>
            <motion.div
              className="absolute rounded-full"
              style={{ width: 140, height: 140, top: -50, left: "12%", background: "#ec4899", opacity: 0.25, filter: "blur(20px)" }}
              animate={{ x: [0, 20, 0], y: [0, 10, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute rounded-full"
              style={{ width: 160, height: 160, top: -60, right: "8%", background: "var(--success)", opacity: 0.2, filter: "blur(24px)" }}
              animate={{ x: [0, -25, 0], y: [0, 14, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
          </div>

          <div className="px-4 sm:px-6 pb-5 sm:pb-6 flex flex-col items-center text-center -mt-10 sm:-mt-12">
            <motion.div
              className="relative shrink-0"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
            >
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-white font-bold"
                style={{
                  background: "linear-gradient(135deg, var(--primary), #0f0f11)",
                  fontSize: "clamp(1.6rem,5vw,2.1rem)",
                  border: "3px solid var(--card)",
                  boxShadow: "0 8px 24px rgba(var(--primary-rgb),0.35)",
                }}
              >
                {(profile.name || profile.email || "?").charAt(0).toUpperCase()}
              </div>
              <motion.div
                className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center"
                style={{ background: "var(--success)", border: "2px solid var(--card)" }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.4 }}
              >
                <CheckCircle size={13} className="text-white" />
              </motion.div>
            </motion.div>

            <motion.h2
              className="text-white mt-3"
              style={{ fontWeight: 700, fontSize: "clamp(1rem,3.2vw,1.25rem)" }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            >
              {profile.name || "Seu nome"}
            </motion.h2>
            {profile.occupation && (
              <p className="flex items-center gap-1.5 mt-0.5" style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>
                <Briefcase size={13} /> {profile.occupation}
              </p>
            )}
            {memberSince && (
              <span
                className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full"
                style={{ background: "rgba(var(--primary-rgb),0.12)", color: "var(--primary)", fontSize: "0.72rem", fontWeight: 500 }}
              >
                <Sparkles size={12} /> Membro desde {memberSince}
              </span>
            )}
          </div>
        </motion.div>

        {/* Personal info */}
        <motion.div variants={itemVariants} whileHover={{ y: -2 }}
          className="rounded-2xl p-4 sm:p-5 text-left transition-shadow"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(var(--primary-rgb),0.14)" }}>
              <User size={15} style={{ color: "var(--primary)" }} />
            </div>
            <h3 className="text-white" style={{ fontWeight: 600 }}>Dados Pessoais</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Nome completo</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                <input style={fieldStyle("name")} value={profile.name}
                  onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Profissão</label>
              <div className="relative">
                <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                <input style={fieldStyle("occupation")} value={profile.occupation}
                  onFocus={() => setFocusedField("occupation")} onBlur={() => setFocusedField(null)}
                  onChange={e => setProfile(p => ({ ...p, occupation: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>E-mail</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                <input style={fieldStyle("email")} type="email" value={profile.email}
                  onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)}
                  onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Telefone</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                <input style={fieldStyle("phone")} value={profile.phone}
                  onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1.5" style={{ color: "var(--muted-foreground)" }}>Cidade</label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                <input style={fieldStyle("city")} value={profile.city}
                  onFocus={() => setFocusedField("city")} onBlur={() => setFocusedField(null)}
                  onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Aparência */}
        <motion.div variants={itemVariants} whileHover={{ y: -2 }}
          className="rounded-2xl p-4 sm:p-5 text-left transition-shadow"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `rgba(${accentColorId ? ACCENT_COLORS.find(c => c.id === accentColorId)?.rgb : "32, 75, 202"}, 0.14)` }}>
              <Palette size={15} style={{ color: "var(--primary)" }} />
            </div>
            <h3 className="text-white" style={{ fontWeight: 600 }}>Aparência</h3>
          </div>
          <p className="mb-3" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
            Escolha a cor de destaque usada em botões, links e itens ativos do menu.
          </p>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map(color => (
              <button
                key={color.id}
                type="button"
                onClick={() => selectAccentColor(color.id)}
                aria-label={`Cor de destaque ${color.label}`}
                aria-pressed={accentColorId === color.id}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{ background: color.hex, border: `2px solid ${accentColorId === color.id ? "#fff" : "transparent"}`, boxShadow: accentColorId === color.id ? `0 0 0 2px ${color.hex}` : "none" }}
              >
                {accentColorId === color.id && <CheckCircle size={16} className="text-white" />}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div variants={itemVariants} whileHover={{ y: -2 }}
          className="rounded-2xl p-4 sm:p-5 text-left transition-shadow"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.14)" }}>
              <Bell size={15} style={{ color: "var(--warning)" }} />
            </div>
            <h3 className="text-white" style={{ fontWeight: 600 }}>Notificações</h3>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {[
              { key: "budgetAlert", label: "Alertas de orçamento", desc: "Quando uma categoria atingir 80% do limite" },
              { key: "weeklyReport", label: "Relatório semanal", desc: "Resumo financeiro toda segunda-feira" },
              { key: "goalUpdate", label: "Atualização de metas", desc: "Notificar quando uma meta for atingida" },
              { key: "monthlyBalance", label: "Balanço mensal", desc: "Resumo completo ao final de cada mês" },
            ].map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                className="flex items-center justify-between py-2.5 px-3 sm:px-4 rounded-xl gap-3"
                style={{ background: "var(--secondary)" }}>
                <div className="min-w-0">
                  <p className="text-white" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{item.label}</p>
                  <p className="hidden sm:block" style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{item.desc}</p>
                </div>
                <button
                  onClick={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                  role="switch"
                  aria-checked={notifications[item.key as keyof typeof notifications]}
                  aria-label={item.label}
                  className="relative w-12 h-6 rounded-full shrink-0"
                  style={{ background: notifications[item.key as keyof typeof notifications] ? "var(--primary)" : "rgba(255,255,255,0.1)", transition: "background 0.25s ease" }}
                >
                  <motion.div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white"
                    animate={{ left: notifications[item.key as keyof typeof notifications] ? 28 : 4 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Security */}
        <motion.div variants={itemVariants} whileHover={{ y: -2 }}
          className="rounded-2xl p-4 sm:p-5 text-left transition-shadow"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.14)" }}>
              <Shield size={15} style={{ color: "var(--red)" }} />
            </div>
            <h3 className="text-white" style={{ fontWeight: 600 }}>Segurança</h3>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between py-2.5 px-3 sm:px-4 rounded-xl gap-3"
              style={{ background: "var(--secondary)" }}>
              <div className="min-w-0 flex items-center gap-2.5">
                <KeyRound size={15} className="shrink-0" style={{ color: "var(--muted-foreground)" }} />
                <div className="min-w-0">
                  <p className="text-white" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Alterar senha</p>
                  <p className="hidden sm:block" style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Enviaremos um link de redefinição para o seu e-mail</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: "rgba(var(--primary-rgb),0.15)", color: "var(--primary)", border: "1px solid rgba(var(--primary-rgb),0.3)", whiteSpace: "nowrap", opacity: changingPassword ? 0.6 : 1, transition: "opacity 0.2s ease" }}>
                {changingPassword ? "Enviando..." : "Alterar"}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
          <motion.button
            onClick={handleSave}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-medium w-full"
            style={{
              background: saved ? "var(--success)" : "var(--primary)",
              opacity: loading ? 0.7 : 1,
              transition: "background 0.3s ease",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {loading ? (
                <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <motion.span
                    className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white"
                    animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                  />
                  Salvando...
                </motion.span>
              ) : saved ? (
                <motion.span key="saved" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <CheckCircle size={16} /> Salvo com sucesso!
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <Save size={16} /> Salvar Alterações
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          <motion.button
            onClick={handleLogout}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-medium w-full sm:w-auto"
            style={{ background: "rgba(217,16,16,0.9)" }}
          >
            <LogOut size={16} /> Sair
          </motion.button>
        </motion.div>

      </div>
    </motion.div>
  );
}
