import { useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Wallet, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useEffect } from "react";

export function Login() {
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const inputStyle = {
        background: "var(--input-background)",
        border: "1px solid var(--border)",
        color: "var(--foreground)",
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                navigate("/");
            }
        });
    }, []);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        console.log("Email:", email);
        console.log("Senha:", password);
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            console.log(error);
            alert(error.message);
            return;
        }

        navigate("/home");
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
                            FinanceOS
                        </h1>

                        <p
                            style={{
                                color: "var(--muted-foreground)",
                                marginTop: "6px",
                            }}
                        >
                            Faça login para continuar
                        </p>
                    </div>

                    {/* Form */}
                    <form className="space-y-4" onSubmit={handleLogin}>
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

                        <button
                            type="submit"
                            className="w-full py-3 rounded-xl text-white font-medium transition-all hover:opacity-90"
                            style={{
                                background: "var(--primary)",
                            }}
                        >
                            Entrar
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p
                            style={{
                                color: "var(--muted-foreground)",
                                fontSize: "0.9rem",
                            }}
                        >
                            Não possui conta?
                        </p>

                        <Link
                            to="/cadastro"
                            className="mt-2 inline-block font-medium"
                            style={{
                                color: "var(--primary)",
                            }}
                        >
                            Criar conta
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}