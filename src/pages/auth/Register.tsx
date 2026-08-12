import { useState, type FormEvent, type ChangeEvent, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Mail,
    Lock,
    Eye,
    EyeOff,
    MessageCircle,
    ArrowRight,
    ArrowLeft,
    Check,
    Upload,
    Camera,
    Sparkles,
    Shield,
    Zap,
    AlertCircle,
    CheckCircle2,
    X,
    Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { uploadAvatar } from "@/api/user.api";
import { checkUsernameAvailability, checkEmailAvailability } from "@/api/auth.api";
import { cn } from "@/lib/utils";
import {
    validateUsername,
    validateFirstName,
    validateLastName,
    validateEmail,
    validatePassword,
    validateBio,
    type RegisterFormData,
} from "@/utils/validators";

type Step = "username" | "name" | "credentials" | "bio" | "creating" | "avatar";

const TOTAL_FORM_STEPS = 4;

const Register = () => {
    const navigate = useNavigate();
    const { register, updateUser } = useAuth();

    const [currentStep, setCurrentStep] = useState<Step>("username");

    // Form fields
    const [formData, setFormData] = useState<RegisterFormData>({
        username: "",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        bio: "",
    });
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    // Errors & Touched
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState("");

    // Avatar upload stage
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Password strength calculation
    const getPasswordStrength = (pass: string) => {
        let score = 0;
        if (pass.length >= 8) score += 25;
        if (/[A-Z]/.test(pass)) score += 25;
        if (/[0-9]/.test(pass)) score += 25;
        if (/[^A-Za-z0-9]/.test(pass)) score += 25;
        return score;
    };
    const strength = getPasswordStrength(formData.password);

    // Field change handler
    const handleChange = (field: keyof RegisterFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setServerError("");
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    // Step 1: Username validation
    const handleNextFromUsername = async () => {
        const error = validateUsername(formData.username);
        if (error) {
            setErrors((prev) => ({ ...prev, username: error }));
            return;
        }

        try {
            setIsCheckingUsername(true);
            const { available } = await checkUsernameAvailability(formData.username);
            if (!available) {
                setErrors((prev) => ({ ...prev, username: "Username is already taken" }));
                return;
            }
        } catch (err: any) {
            setErrors((prev) => ({ ...prev, username: err.message || "Failed to check username" }));
            return;
        } finally {
            setIsCheckingUsername(false);
        }

        setErrors({});
        setCurrentStep("name");
    };

    // Step 2: Name validation
    const handleNextFromName = () => {
        const fnError = validateFirstName(formData.firstName);
        const lnError = validateLastName(formData.lastName);
        if (fnError || lnError) {
            setErrors({
                ...(fnError && { firstName: fnError }),
                ...(lnError && { lastName: lnError }),
            });
            return;
        }
        setErrors({});
        setCurrentStep("credentials");
    };

    // Step 3: Credentials validation
    const handleNextFromCredentials = async () => {
        const emailError = validateEmail(formData.email);
        const passError = validatePassword(formData.password);
        let matchError: string | null = null;
        if (formData.password !== confirmPassword) {
            matchError = "Passwords do not match";
        }

        if (emailError || passError || matchError) {
            setErrors({
                ...(emailError && { email: emailError }),
                ...(passError && { password: passError }),
                ...(matchError && { confirmPassword: matchError }),
            });
            return;
        }

        try {
            setIsCheckingEmail(true);
            const { available } = await checkEmailAvailability(formData.email);
            if (!available) {
                setErrors((prev) => ({ ...prev, email: "Email is already taken" }));
                return;
            }
        } catch (err: any) {
            setErrors((prev) => ({ ...prev, email: err.message || "Failed to check email" }));
            return;
        } finally {
            setIsCheckingEmail(false);
        }

        setErrors({});
        setCurrentStep("bio");
    };

    // Step 4: Final registration submit & loading state
    const handleRegisterSubmit = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        setServerError("");

        const bioError = validateBio(formData.bio);
        if (bioError) {
            setErrors({ bio: bioError });
            return;
        }

        setCurrentStep("creating");

        try {
            await register({
                username: formData.username.trim().toLowerCase(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName?.trim() || null,
                bio: formData.bio?.trim() || null,
            });

            setTimeout(() => {
                setCurrentStep("avatar");
            }, 1200);
        } catch (err) {
            setCurrentStep("bio");
            if (err instanceof Error) {
                setServerError(err.message);
            } else {
                setServerError("Failed to create your account. Please try again.");
            }
        }
    };

    // Avatar selection
    const handleAvatarSelect = (e: ChangeEvent<HTMLInputElement>) => {
        setAvatarError("");
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setAvatarError("Please select a valid image file (JPG, PNG, WebP)");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setAvatarError("Image must be smaller than 5MB");
            return;
        }

        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    // Avatar upload / complete onboarding
    const handleFinishAvatar = async () => {
        if (avatarFile) {
            setUploadingAvatar(true);
            setAvatarError("");
            try {
                const newAvatarUrl = await uploadAvatar(avatarFile);
                updateUser({ avatarUrl: newAvatarUrl });
                navigate("/", { replace: true });
            } catch (err) {
                if (err instanceof Error) {
                    setAvatarError(err.message);
                } else {
                    setAvatarError("Failed to upload avatar. You can continue anyway.");
                }
                setUploadingAvatar(false);
            }
        } else {
            navigate("/", { replace: true });
        }
    };

    const getStepNumber = () => {
        switch (currentStep) {
            case "username":
                return 1;
            case "name":
                return 2;
            case "credentials":
                return 3;
            case "bio":
                return 4;
            default:
                return 0;
        }
    };

    return (
        <div className="min-h-screen w-full bg-background bg-ambient-glow flex flex-col justify-between p-4 sm:p-8 lg:p-12 overflow-x-hidden">
            {/* Top Minimal Header */}
            <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10">
                <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-2xl bg-gradient-chat-sender flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                        <MessageCircle className="size-5" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-foreground">
                        Pinsta Chat
                    </span>
                </div>

            </header>

            {/* Immersive Responsive Canvas */}
            <main className="w-full max-w-5xl mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center z-10">
                {/* Left Side: Dynamic Ambient Story & Highlights (Hidden on small mobile, gorgeous on tablet/desktop) */}
                <div className="hidden md:flex lg:col-span-5 flex-col justify-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold w-fit">
                        <Sparkles className="size-3.5" />
                        <span>Next-Gen Encrypted Messenger</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] text-foreground">
                        Speed. Privacy. <br />
                        <span className="text-primary">
                            Pure Expression.
                        </span>
                    </h1>

                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        Experience real-time encrypted messaging with Instagram-grade colorful bubbles, crystal clear voice notes, and seamless media sharing.
                    </p>

                    {/* Dynamic Feature Bullets */}
                    <div className="grid grid-cols-1 gap-3 pt-2">
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-card/40 border border-border/60 backdrop-blur-sm shadow-xs">
                            <div className="size-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                <Zap className="size-4" />
                            </div>
                            <div>
                                <h2 className="text-xs font-bold text-foreground">Ultra-Fast Realtime</h2>
                                <p className="text-[11px] text-muted-foreground">Instant socket delivery & read receipts</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-card/40 border border-border/60 backdrop-blur-sm shadow-xs">
                            <div className="size-9 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
                                <Shield className="size-4" />
                            </div>
                            <div>
                                <h2 className="text-xs font-bold text-foreground">Granular Security</h2>
                                <p className="text-[11px] text-muted-foreground">Full blocklist management & chat deletion</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Step-by-Step Interactive Full Surface */}
                <div className="w-full lg:col-span-7 flex flex-col justify-center">
                    <div className="w-full max-w-xl mx-auto backdrop-blur-2xl bg-card/80 border border-border/80 rounded-3xl p-6 sm:p-10 shadow-xl shadow-indigo-500/5 transition-all">
                        {/* Step Progress Header */}
                        {getStepNumber() > 0 && currentStep !== "creating" && currentStep !== "avatar" && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between text-xs font-bold tracking-wide uppercase text-muted-foreground mb-2.5">
                                    <span className="text-primary">Phase {getStepNumber()} of {TOTAL_FORM_STEPS}</span>
                                    <span>{Math.round((getStepNumber() / TOTAL_FORM_STEPS) * 100)}% Complete</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex gap-1.5">
                                    {[1, 2, 3, 4].map((step) => (
                                        <div
                                            key={step}
                                            className={cn(
                                                "h-full flex-1 rounded-full transition-all duration-500",
                                                getStepNumber() >= step
                                                    ? "bg-gradient-chat-sender shadow-xs shadow-indigo-500/30"
                                                    : "bg-muted/70"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Server Error Alert */}
                        {serverError && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-medium text-destructive"
                                role="alert"
                            >
                                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                                <span className="flex-1">{serverError}</span>
                            </motion.div>
                        )}

                        <AnimatePresence mode="wait">
                            {/* =========================================================================
                                STEP 1: USERNAME
                               ========================================================================= */}
                            {currentStep === "username" && (
                                <motion.div
                                    key="username"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -16 }}
                                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                                            Choose your unique handle
                                        </h2>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            This will be your permanent identity on Pinsta Chat.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="reg-username" className="text-xs font-semibold">
                                            Username
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-base">
                                                @
                                            </span>
                                            <Input
                                                id="reg-username"
                                                placeholder="username"
                                                autoComplete="username"
                                                autoFocus
                                                value={formData.username}
                                                onChange={(e) => handleChange("username", e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleNextFromUsername()}
                                                aria-invalid={Boolean(errors.username)}
                                                className="pl-10 h-12 text-base rounded-2xl bg-card border-border shadow-xs focus-visible:ring-primary"
                                            />
                                        </div>
                                        {errors.username ? (
                                            <p className="text-xs text-destructive font-medium pl-1">
                                                {errors.username}
                                            </p>
                                        ) : (
                                            <p className="text-[11px] text-muted-foreground pl-1">
                                                Must be 5–14 characters (letters, numbers, and underscores).
                                            </p>
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <Button
                                            type="button"
                                            onClick={handleNextFromUsername}
                                            disabled={isCheckingUsername}
                                            className="w-full h-12 rounded-2xl font-bold text-sm bg-gradient-chat-sender text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all gap-2"
                                        >
                                            {isCheckingUsername ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <span>Continue to Profile</span>
                                                    <ArrowRight className="size-4" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* =========================================================================
                                STEP 2: NAME
                               ========================================================================= */}
                            {currentStep === "name" && (
                                <motion.div
                                    key="name"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -16 }}
                                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                                            What&apos;s your name?
                                        </h2>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Enter how you want your display name to appear in chats.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="reg-firstname" className="text-xs font-semibold">
                                                First Name
                                            </Label>
                                            <div className="relative">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                                <Input
                                                    id="reg-firstname"
                                                    placeholder="Alex"
                                                    autoComplete="given-name"
                                                    autoFocus
                                                    value={formData.firstName}
                                                    onChange={(e) => handleChange("firstName", e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleNextFromName()}
                                                    aria-invalid={Boolean(errors.firstName)}
                                                    className="pl-10 h-12 text-sm rounded-2xl bg-card border-border shadow-xs focus-visible:ring-primary"
                                                />
                                            </div>
                                            {errors.firstName && (
                                                <p className="text-xs text-destructive font-medium pl-1">
                                                    {errors.firstName}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="reg-lastname" className="text-xs font-semibold">
                                                    Last Name
                                                </Label>
                                                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full font-medium">Optional</span>
                                            </div>
                                            <Input
                                                id="reg-lastname"
                                                placeholder="Smith"
                                                autoComplete="family-name"
                                                value={formData.lastName || ""}
                                                onChange={(e) => handleChange("lastName", e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleNextFromName()}
                                                className="h-12 text-sm rounded-2xl bg-card border-border shadow-xs focus-visible:ring-primary"
                                            />
                                            {errors.lastName && (
                                                <p className="text-xs text-destructive font-medium pl-1">
                                                    {errors.lastName}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setCurrentStep("username")}
                                            className="h-12 px-5 rounded-2xl border-border hover:bg-secondary"
                                        >
                                            <ArrowLeft className="size-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleNextFromName}
                                            className="flex-1 h-12 rounded-2xl font-bold text-sm bg-gradient-chat-sender text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all gap-2"
                                        >
                                            <span>Continue</span>
                                            <ArrowRight className="size-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* =========================================================================
                                STEP 3: CREDENTIALS (Email & Password)
                               ========================================================================= */}
                            {currentStep === "credentials" && (
                                <motion.div
                                    key="credentials"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -16 }}
                                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="space-y-5"
                                >
                                    <div>
                                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                                            Security & Credentials
                                        </h2>
                                        <p className="mt-1.5 text-sm text-muted-foreground">
                                            Protect your account with a verified email and password.
                                        </p>
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="reg-email" className="text-xs font-semibold">
                                            Email Address
                                        </Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                            <Input
                                                id="reg-email"
                                                type="email"
                                                placeholder="alex@example.com"
                                                autoComplete="email"
                                                autoFocus
                                                value={formData.email}
                                                onChange={(e) => handleChange("email", e.target.value)}
                                                aria-invalid={Boolean(errors.email)}
                                                className="pl-10 h-12 text-sm rounded-2xl bg-card border-border shadow-xs focus-visible:ring-primary"
                                            />
                                        </div>
                                        {errors.email && (
                                            <p className="text-xs text-destructive font-medium pl-1">
                                                {errors.email}
                                            </p>
                                        )}
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="reg-password" className="text-xs font-semibold">
                                            Password
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                            <Input
                                                id="reg-password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="8–16 characters"
                                                autoComplete="new-password"
                                                value={formData.password}
                                                onChange={(e) => handleChange("password", e.target.value)}
                                                aria-invalid={Boolean(errors.password)}
                                                className="pl-10 pr-11 h-12 text-sm rounded-2xl bg-card border-border shadow-xs focus-visible:ring-primary"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-0 top-0 flex h-full items-center px-3.5 text-muted-foreground hover:text-foreground transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                        {/* Colorful Strength bar */}
                                        {formData.password.length > 0 && (
                                            <div className="pt-1 px-1">
                                                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                                    <motion.div
                                                        className={cn(
                                                            "h-full transition-all duration-300",
                                                            strength < 50
                                                                ? "bg-destructive"
                                                                : strength < 75
                                                                ? "bg-amber-500"
                                                                : "bg-emerald-500"
                                                        )}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${strength}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center mt-1 text-[11px] text-muted-foreground">
                                                    <span>8–16 characters</span>
                                                    <span className="font-semibold">
                                                        {strength < 50 ? "Weak" : strength < 75 ? "Good" : "Strong"}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {errors.password && (
                                            <p className="text-xs text-destructive font-medium pl-1">
                                                {errors.password}
                                            </p>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="reg-confirmpassword" className="text-xs font-semibold">
                                            Confirm Password
                                        </Label>
                                        <div className="relative">
                                            <CheckCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                            <Input
                                                id="reg-confirmpassword"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Re-enter password"
                                                autoComplete="new-password"
                                                value={confirmPassword}
                                                onChange={(e) => {
                                                    setConfirmPassword(e.target.value);
                                                    if (errors.confirmPassword) {
                                                        setErrors((prev) => {
                                                            const next = { ...prev };
                                                            delete next.confirmPassword;
                                                            return next;
                                                        });
                                                    }
                                                }}
                                                onKeyDown={(e) => e.key === "Enter" && handleNextFromCredentials()}
                                                aria-invalid={Boolean(errors.confirmPassword)}
                                                className="pl-10 h-12 text-sm rounded-2xl bg-card border-border shadow-xs focus-visible:ring-primary"
                                            />
                                        </div>
                                        {errors.confirmPassword && (
                                            <p className="text-xs text-destructive font-medium pl-1">
                                                {errors.confirmPassword}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setCurrentStep("name")}
                                            className="h-12 px-5 rounded-2xl border-border hover:bg-secondary"
                                        >
                                            <ArrowLeft className="size-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleNextFromCredentials}
                                            disabled={isCheckingEmail}
                                            className="flex-1 h-12 rounded-2xl font-bold text-sm bg-gradient-chat-sender text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all gap-2"
                                        >
                                            {isCheckingEmail ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <span>Continue</span>
                                                    <ArrowRight className="size-4" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* =========================================================================
                                STEP 4: BIO (Optional)
                               ========================================================================= */}
                            {currentStep === "bio" && (
                                <motion.div
                                    key="bio"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -16 }}
                                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                                            Tell the world about yourself
                                        </h2>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Add a short biography. You can always edit or update this later.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="reg-bio" className="text-xs font-semibold">
                                                    Bio
                                                </Label>
                                                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full font-medium">Optional</span>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground">
                                                {formData.bio?.length || 0} / 200
                                            </span>
                                        </div>
                                        <textarea
                                            id="reg-bio"
                                            rows={4}
                                            placeholder="Designer, engineer, coffee enthusiast..."
                                            value={formData.bio || ""}
                                            onChange={(e) => handleChange("bio", e.target.value)}
                                            className="w-full rounded-2xl border border-border bg-card p-3.5 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none resize-none transition-all"
                                        />
                                        {errors.bio && (
                                            <p className="text-xs text-destructive font-medium pl-1">
                                                {errors.bio}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setCurrentStep("credentials")}
                                            className="h-12 px-5 rounded-2xl border-border hover:bg-secondary"
                                        >
                                            <ArrowLeft className="size-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => handleRegisterSubmit()}
                                            className="flex-1 h-12 rounded-2xl font-bold text-sm bg-gradient-chat-sender text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all gap-2"
                                        >
                                            <span>Complete Registration</span>
                                            <Check className="size-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* =========================================================================
                                STEP 5: PROVISIONING / EQUALIZER SOUNDWAVE LOADER
                               ========================================================================= */}
                            {currentStep === "creating" && (
                                <motion.div
                                    key="creating"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.25 }}
                                    className="py-12 text-center space-y-6"
                                >
                                    <div className="flex justify-center">
                                        <div className="flex items-center justify-center gap-2 h-16 px-6 py-3 rounded-3xl bg-secondary/80 border border-border/80 shadow-inner">
                                            {[0.1, 0.25, 0.4, 0.2, 0.35, 0.15].map((delay, index) => (
                                                <motion.div
                                                    key={index}
                                                    className="w-1.5 bg-gradient-chat-sender rounded-full"
                                                    animate={{
                                                        height: ["18px", "48px", "18px"],
                                                        opacity: [0.5, 1, 0.5],
                                                    }}
                                                    transition={{
                                                        duration: 1.1,
                                                        repeat: Infinity,
                                                        delay,
                                                        ease: "easeInOut",
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h2 className="text-2xl font-extrabold text-foreground">
                                            Creating your account
                                        </h2>
                                        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                                            Configuring real-time WebSocket channels, encrypting identity, and provisioning your @handle...
                                        </p>
                                    </div>

                                    <div className="w-full max-w-xs mx-auto bg-secondary h-2 rounded-full overflow-hidden relative">
                                        <motion.div
                                            className="absolute inset-y-0 bg-gradient-chat-sender rounded-full shadow-md shadow-indigo-500/40"
                                            animate={{
                                                left: ["-40%", "100%"],
                                                width: ["40%", "60%"],
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                ease: [0.4, 0, 0.2, 1],
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* =========================================================================
                                STEP 6: AVATAR SETUP
                               ========================================================================= */}
                            {currentStep === "avatar" && (
                                <motion.div
                                    key="avatar"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="space-y-6 text-center"
                                >
                                    <div>
                                        <div className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-3 shadow-xs">
                                            <Check className="size-6 stroke-[2.5]" />
                                        </div>
                                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                                            Account Verified!
                                        </h2>
                                        <p className="mt-1.5 text-sm text-muted-foreground">
                                            Upload a personal avatar, or continue with our default image.
                                        </p>
                                    </div>

                                    {/* Avatar Upload Surface */}
                                    <div className="flex flex-col items-center justify-center space-y-4 py-2">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleAvatarSelect}
                                            accept="image/*"
                                            className="hidden"
                                        />

                                        <div className="relative group">
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className={cn(
                                                    "size-32 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer",
                                                    "bg-card hover:bg-secondary/70 transition-all duration-200 shadow-md",
                                                    avatarPreview && "border-solid border-primary ring-4 ring-primary/20"
                                                )}
                                            >
                                                {avatarPreview ? (
                                                    <img
                                                        src={avatarPreview}
                                                        alt="Avatar Preview"
                                                        className="size-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center text-muted-foreground group-hover:text-primary transition-colors">
                                                        <Camera className="size-8 stroke-[1.5]" />
                                                        <span className="text-xs mt-1.5 font-bold">Upload Photo</span>
                                                    </div>
                                                )}
                                            </div>

                                            {avatarPreview && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setAvatarFile(null);
                                                        setAvatarPreview(null);
                                                    }}
                                                    className="absolute top-0 right-0 size-7 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                                                    aria-label="Remove photo"
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            )}
                                        </div>

                                        {avatarError && (
                                            <p className="text-xs text-destructive font-medium max-w-xs">
                                                {avatarError}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <Button
                                            type="button"
                                            disabled={uploadingAvatar}
                                            onClick={handleFinishAvatar}
                                            className="w-full h-12 rounded-2xl font-bold text-sm bg-gradient-chat-sender text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all gap-2"
                                        >
                                            {uploadingAvatar ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex gap-1">
                                                        <span className="size-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                        <span className="size-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                        <span className="size-1.5 bg-white rounded-full animate-bounce" />
                                                    </div>
                                                    <span>Uploading avatar…</span>
                                                </div>
                                            ) : avatarFile ? (
                                                <>
                                                    <Upload className="size-4" />
                                                    <span>Save Avatar & Enter Chat</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Enter Pinsta Chat</span>
                                                    <ArrowRight className="size-4" />
                                                </>
                                            )}
                                        </Button>

                                        {avatarFile && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                disabled={uploadingAvatar}
                                                onClick={() => navigate("/", { replace: true })}
                                                className="w-full text-muted-foreground text-xs"
                                            >
                                                Skip and use default avatar
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            {/* Bottom Footer Credits */}
            <footer className="w-full max-w-5xl mx-auto text-center text-xs text-muted-foreground/80 py-4 z-10">
                End-to-end encrypted real-time communication &bull; Pinsta Chat
            </footer>
        </div>
    );
};

export default Register;