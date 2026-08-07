import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    MessageCircle,
    AlertCircle,
    ArrowRight,
    Sparkles,
    Shield,
    Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    validateLoginForm,
    validateEmail,
    validatePassword,
    type LoginFormData,
} from "@/utils/validators";

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState<LoginFormData>({
        email: "",
        password: "",
    });

    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof LoginFormData, boolean>>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState("");
    const [loading, setLoading] = useState(false);

    // Handle field changes and live re-validation for touched fields
    const handleChange = (field: keyof LoginFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setServerError("");

        if (touched[field]) {
            let error: string | null = null;
            if (field === "email") {
                error = validateEmail(value);
            } else if (field === "password") {
                error = validatePassword(value);
            }

            setFieldErrors((prev) => ({
                ...prev,
                [field]: error ?? undefined,
            }));
        }
    };

    // Validate field on blur
    const handleBlur = (field: keyof LoginFormData) => {
        setTouched((prev) => ({ ...prev, [field]: true }));

        let error: string | null = null;
        if (field === "email") {
            error = validateEmail(formData.email);
        } else if (field === "password") {
            error = validatePassword(formData.password);
        }

        setFieldErrors((prev) => ({
            ...prev,
            [field]: error ?? undefined,
        }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setServerError("");

        setTouched({
            email: true,
            password: true,
        });

        const validation = validateLoginForm(formData);
        if (!validation.isValid) {
            setFieldErrors(validation.errors);
            return;
        }

        setLoading(true);

        try {
            await login({
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
            });
            navigate("/", { replace: true });
        } catch (err) {
            if (err instanceof Error) {
                setServerError(err.message);
            } else {
                setServerError("Login failed. Please check your credentials and try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-background bg-ambient-glow flex flex-col justify-between p-4 sm:p-8 lg:p-12 overflow-x-hidden">
            {/* Top Navigation Header */}
            <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10">
                <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-2xl bg-gradient-chat-sender flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                        <MessageCircle className="size-5" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-foreground">
                        Pinsta Chat
                    </span>
                </div>

                <Link
                    to="/register"
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border/80 hover:border-border bg-card/60 backdrop-blur-md"
                >
                    New here? <span className="text-primary font-bold ml-1">Create account</span>
                </Link>
            </header>

            {/* Immersive Responsive Canvas */}
            <main className="w-full max-w-5xl mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center z-10">
                {/* Left Side: Brand Story & Glowing Hero Section (Visible on tablet/desktop) */}
                <div className="hidden md:flex lg:col-span-6 flex-col justify-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold w-fit">
                        <Sparkles className="size-3.5" />
                        <span>Welcome Back</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] text-foreground">
                        Your encrypted <br />
                        <span className="bg-gradient-chat-sender bg-clip-text text-transparent">
                            conversations await.
                        </span>
                    </h1>

                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        Stay connected with real-time typing indicators, Instagram-style colorful bubbles, and end-to-end security.
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-3.5 rounded-2xl bg-card/40 border border-border/60 backdrop-blur-sm shadow-xs">
                            <Zap className="size-5 text-indigo-500 mb-1.5" />
                            <h3 className="text-xs font-bold text-foreground">Instant Sync</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Real-time socket delivery</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-card/40 border border-border/60 backdrop-blur-sm shadow-xs">
                            <Shield className="size-5 text-pink-500 mb-1.5" />
                            <h3 className="text-xs font-bold text-foreground">Private & Safe</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Zero unverified tracking</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Interactive Sign-in Surface */}
                <div className="w-full lg:col-span-6 flex flex-col justify-center">
                    <div className="w-full max-w-md mx-auto backdrop-blur-2xl bg-card/80 border border-border/80 rounded-3xl p-6 sm:p-10 shadow-xl shadow-indigo-500/5">
                        <div className="mb-6">
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                                Sign In
                            </h2>
                            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                                Enter your email and password to access your chats.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate className="space-y-4">
                            {/* Server Error Alert */}
                            {serverError && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive"
                                    role="alert"
                                >
                                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                                    <span className="flex-1">{serverError}</span>
                                </motion.div>
                            )}

                            {/* Email Input */}
                            <div className="space-y-1.5">
                                <Label htmlFor="login-email" className="text-xs font-semibold">
                                    Email Address
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="login-email"
                                        type="email"
                                        placeholder="alex@example.com"
                                        autoComplete="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange("email", e.target.value)}
                                        onBlur={() => handleBlur("email")}
                                        aria-invalid={Boolean(fieldErrors.email)}
                                        aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                                        className="pl-10 h-12 text-sm rounded-2xl bg-card border-border shadow-xs focus-visible:ring-primary"
                                        disabled={loading}
                                    />
                                </div>
                                {fieldErrors.email && (
                                    <p
                                        id="login-email-error"
                                        className="text-xs text-destructive font-medium pl-1"
                                    >
                                        {fieldErrors.email}
                                    </p>
                                )}
                            </div>

                            {/* Password Input */}
                            <div className="space-y-1.5">
                                <Label htmlFor="login-password" className="text-xs font-semibold">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="login-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        value={formData.password}
                                        onChange={(e) => handleChange("password", e.target.value)}
                                        onBlur={() => handleBlur("password")}
                                        aria-invalid={Boolean(fieldErrors.password)}
                                        aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                                        className="pl-10 pr-11 h-12 text-sm rounded-2xl bg-card border-border shadow-xs focus-visible:ring-primary"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-0 flex h-full items-center px-3.5 text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="size-4" />
                                        ) : (
                                            <Eye className="size-4" />
                                        )}
                                    </button>
                                </div>
                                {fieldErrors.password && (
                                    <p
                                        id="login-password-error"
                                        className="text-xs text-destructive font-medium pl-1"
                                    >
                                        {fieldErrors.password}
                                    </p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 mt-4 rounded-2xl font-bold text-sm bg-gradient-chat-sender text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all gap-2"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="size-4 animate-spin" />
                                        <span>Signing in…</span>
                                    </div>
                                ) : (
                                    <>
                                        <span>Enter Conversations</span>
                                        <ArrowRight className="size-4" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-xs text-muted-foreground">
                            Don&apos;t have an account?{" "}
                            <Link
                                to="/register"
                                className="font-bold text-primary hover:underline transition-all ml-1"
                            >
                                Register now
                            </Link>
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full max-w-5xl mx-auto text-center text-xs text-muted-foreground/80 py-4 z-10">
                End-to-end encrypted real-time communication &bull; Pinsta Chat
            </footer>
        </div>
    );
};

export default Login;