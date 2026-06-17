import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { motion } from "motion/react";
import {
    Wallet,
    Eye,
    EyeOff,
    Mail,
    Lock,
    User
} from "lucide-react";

export function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const inputStyle = {
        background: "var(--input-background)",
        border: "1px solid var(--border)",
        color: "var(--foreground)",
    };

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert("As senhas não coincidem");
            return;
        }

        if (password.length < 6) {
            alert("Senha muito fraca (mínimo 6 caracteres)");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password.trim(),
            options: {
                data: {
                    name: name.trim(),
                },
            },
        });

        setLoading(false);

        if (error) {
            console.log(error);
            alert(error.message);
            return;
        }

        alert("Conta criada com sucesso!");
        navigate("/login");
    }

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
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div
                            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                            style={{
                                background: "var(--primary)",
                            }}
                        >
                            <Wallet size={28} color="white" />
                        </div>

                        <h1
                            className="text-white"
                            style={{
                                fontSize: "1.8rem",
                                fontWeight: 700,
                            }}
                        >
                            Criar Conta
                        </h1>

                        <p
                            style={{
                                color: "var(--muted-foreground)",
                                marginTop: "6px",
                            }}
                        >
                            Comece a controlar suas finanças
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleRegister}>
                        {/* Nome */}
                        <div>
                            <label
                                className="block mb-2 text-sm"
                                style={{ color: "var(--muted-foreground)" }}
                            >
                                Nome
                            </label>

                            <div className="relative">
                                <User
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2"
                                    style={{ color: "var(--muted-foreground)" }}
                                />

                                <input
                                    type="text"
                                    placeholder="Seu nome"
                                    className="w-full rounded-xl py-3 pl-11 pr-4 outline-none"
                                    style={inputStyle}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label
                                className="block mb-2 text-sm"
                                style={{ color: "var(--muted-foreground)" }}
                            >
                                E-mail
                            </label>

                            <div className="relative">
                                <Mail
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2"
                                    style={{ color: "var(--muted-foreground)" }}
                                />

                                <input
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="w-full rounded-xl py-3 pl-11 pr-4 outline-none"
                                    style={inputStyle}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Senha */}
                        <div>
                            <label
                                className="block mb-2 text-sm"
                                style={{ color: "var(--muted-foreground)" }}
                            >
                                Senha
                            </label>

                            <div className="relative">
                                <Lock
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2"
                                    style={{ color: "var(--muted-foreground)" }}
                                />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl py-3 pl-11 pr-12 outline-none"
                                    style={inputStyle}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} color="#94a3b8" />
                                    ) : (
                                        <Eye size={18} color="#94a3b8" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirmar senha */}
                        <div>
                            <label
                                className="block mb-2 text-sm"
                                style={{ color: "var(--muted-foreground)" }}
                            >
                                Confirmar Senha
                            </label>

                            <div className="relative">
                                <Lock
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2"
                                    style={{ color: "var(--muted-foreground)" }}
                                />
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl py-3 pl-11 pr-12 outline-none"
                                    style={inputStyle}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                    {showConfirm ? (
                                        <EyeOff size={18} color="#94a3b8" />
                                    ) : (
                                        <Eye size={18} color="#94a3b8" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl text-white font-medium transition-all hover:opacity-90"
                            style={{
                                background: "var(--primary)",
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? "Criando..." : "Criar Conta"}
                        </button>

                        <div className="relative py-2">
                            <div
                                style={{
                                    height: "1px",
                                    background: "var(--border)",
                                }}
                            />
                            <span
                                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-3"
                                style={{
                                    background: "var(--card)",
                                    color: "var(--muted-foreground)",
                                    fontSize: "0.8rem",
                                }}
                            >
                                ou
                            </span>
                        </div>

                        <button
                            type="button"
                            className="w-full py-3 rounded-xl font-medium"
                            style={{
                                background: "var(--secondary)",
                                border: "1px solid var(--border)",
                                color: "var(--foreground)",
                            }}
                        >
                            Continuar com Google
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p
                            style={{
                                color: "var(--muted-foreground)",
                                fontSize: "0.9rem",
                            }}
                        >
                            Já possui conta?
                        </p>

                        <Link
                            to="/login"
                            className="mt-2 inline-block font-medium"
                            style={{
                                color: "var(--primary)",
                            }}
                        >
                            Fazer Login
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}