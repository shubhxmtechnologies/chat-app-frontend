import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    Mail,
    Lock,
    Eye,
    EyeOff,
    Camera,
    Copy,
    Check,
    CheckCircle2,
    Shield,
    LogOut,
    Maximize2,
    X,
    UserCheck,
    Loader2,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import {
    uploadAvatar,
    updateName,
    updateEmail,
    changePassword,
    updateBio,
    getBlockedUsers,
    unblockUser,
    type SearchUser,
} from "@/api/user.api";
import {
    validateFirstName,
    validateLastName,
    validateEmail,
    validatePassword,
    validateBio,
} from "@/utils/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEFAULT_AVATAR = "https://cutiedp.com/wp-content/uploads/2025/08/no-dp-image-4.webp";

const Profile = () => {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Active Section Tab
    const [activeTab, setActiveTab] = useState<"general" | "security" | "blocked">("general");

    // Copy handle feedback
    const [copiedHandle, setCopiedHandle] = useState(false);

    // Fullscreen DP Lightbox
    const [showFullAvatar, setShowFullAvatar] = useState(false);

    // Avatar state
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState("");
    const [avatarSuccess, setAvatarSuccess] = useState("");

    // Blocked user profile modal
    const [viewingBlockedUser, setViewingBlockedUser] = useState<SearchUser | null>(null);
    const [showBlockedUserDp, setShowBlockedUserDp] = useState(false);
    const [copiedBlockedHandle, setCopiedBlockedHandle] = useState(false);

    // Name state & validation
    const [firstName, setFirstName] = useState(user?.name?.firstName || "");
    const [lastName, setLastName] = useState(user?.name?.lastName || "");
    const [savingName, setSavingName] = useState(false);
    const [nameErrors, setNameErrors] = useState<{ firstName?: string; lastName?: string }>({});
    const [nameSuccess, setNameSuccess] = useState("");

    // Bio state & validation
    const [bio, setBio] = useState(user?.bio || "");
    const [savingBio, setSavingBio] = useState(false);
    const [bioError, setBioError] = useState("");
    const [bioSuccess, setBioSuccess] = useState("");

    // Email state & validation
    const [email, setEmail] = useState(user?.email || "");
    const [savingEmail, setSavingEmail] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [emailSuccess, setEmailSuccess] = useState("");

    // Password change state & validation
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState<{
        current?: string;
        new?: string;
        confirm?: string;
    }>({});
    const [passwordSuccess, setPasswordSuccess] = useState("");

    // Blocked users
    const [blockedUsers, setBlockedUsers] = useState<SearchUser[]>([]);
    const [loadingBlocked, setLoadingBlocked] = useState(false);
    const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

    // Sync state when user context updates
    useEffect(() => {
        if (user) {
            setFirstName(user.name?.firstName || "");
            setLastName(user.name?.lastName || "");
            setBio(user.bio || "");
            setEmail(user.email || "");
        }
    }, [user]);

    // Fetch blocked users when switching to blocked tab
    useEffect(() => {
        if (activeTab === "blocked") {
            void loadBlockedUsers();
        }
    }, [activeTab]);

    const loadBlockedUsers = async () => {
        try {
            setLoadingBlocked(true);
            const list = await getBlockedUsers();
            setBlockedUsers(list);
        } catch (err) {
            console.error("Failed to load blocked users:", err);
        } finally {
            setLoadingBlocked(false);
        }
    };

    const handleUnblock = async (targetId: string) => {
        try {
            setUnblockingUserId(targetId);
            await unblockUser(targetId);
            setBlockedUsers((prev) => prev.filter((u) => u._id !== targetId));
        } catch (err) {
            console.error("Failed to unblock user:", err);
        } finally {
            setUnblockingUserId(null);
        }
    };

    // Copy handle to clipboard
    const handleCopyHandle = async () => {
        if (!user?.username) return;
        try {
            await navigator.clipboard.writeText(`@${user.username}`);
            setCopiedHandle(true);
            setTimeout(() => setCopiedHandle(false), 2000);
        } catch (err) {
            console.error("Failed to copy handle:", err);
        }
    };

    // Avatar upload handler
    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatarError("");
        setAvatarSuccess("");

        if (!file.type.startsWith("image/")) {
            setAvatarError("Please select a valid image file (JPG, PNG, WebP).");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setAvatarError("Avatar image must be smaller than 5MB.");
            return;
        }

        try {
            setUploadingAvatar(true);
            const newAvatarUrl = await uploadAvatar(file);
            updateUser({ avatarUrl: newAvatarUrl });
            setAvatarSuccess("Profile photo updated successfully!");
            setTimeout(() => setAvatarSuccess(""), 3000);
        } catch (err) {
            setAvatarError(err instanceof Error ? err.message : "Failed to upload avatar");
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Copy blocked user handle
    const handleCopyBlockedHandle = async (username: string) => {
        try {
            await navigator.clipboard.writeText(`@${username}`);
            setCopiedBlockedHandle(true);
            setTimeout(() => setCopiedBlockedHandle(false), 2000);
        } catch (err) {
            console.error("Failed to copy handle:", err);
        }
    };

    // Save Name handler — skip if unchanged
    const handleSaveName = async (e: React.FormEvent) => {
        e.preventDefault();
        setNameSuccess("");

        const fnErr = validateFirstName(firstName);
        const lnErr = validateLastName(lastName);

        if (fnErr || lnErr) {
            setNameErrors({
                ...(fnErr && { firstName: fnErr }),
                ...(lnErr && { lastName: lnErr }),
            });
            return;
        }

        // Dirty check — don't hit API if nothing changed
        const currentFirst = (user?.name?.firstName || "").trim();
        const currentLast = (user?.name?.lastName || "").trim();
        if (firstName.trim() === currentFirst && (lastName.trim() || "") === currentLast) {
            setNameSuccess("No changes to save.");
            setTimeout(() => setNameSuccess(""), 2000);
            return;
        }

        setNameErrors({});
        try {
            setSavingName(true);
            const updated = await updateName(firstName.trim(), lastName.trim() || null);
            updateUser({ name: updated });
            setNameSuccess("Name updated successfully!");
            setTimeout(() => setNameSuccess(""), 3000);
        } catch (err) {
            setNameErrors({
                firstName: err instanceof Error ? err.message : "Failed to update name",
            });
        } finally {
            setSavingName(false);
        }
    };

    // Save Bio handler — skip if unchanged
    const handleSaveBio = async (e: React.FormEvent) => {
        e.preventDefault();
        setBioSuccess("");

        const bErr = validateBio(bio);
        if (bErr) {
            setBioError(bErr);
            return;
        }

        // Dirty check
        const currentBio = (user?.bio || "").trim();
        if ((bio.trim() || "") === currentBio) {
            setBioSuccess("No changes to save.");
            setTimeout(() => setBioSuccess(""), 2000);
            return;
        }

        setBioError("");
        try {
            setSavingBio(true);
            const updated = await updateBio(bio.trim() || null);
            updateUser({ bio: updated });
            setBioSuccess("Bio updated successfully!");
            setTimeout(() => setBioSuccess(""), 3000);
        } catch (err) {
            setBioError(err instanceof Error ? err.message : "Failed to update bio");
        } finally {
            setSavingBio(false);
        }
    };

    // Save Email handler — skip if unchanged
    const handleSaveEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailSuccess("");

        const eErr = validateEmail(email);
        if (eErr) {
            setEmailError(eErr);
            return;
        }

        // Dirty check
        if (email.trim().toLowerCase() === (user?.email || "").trim().toLowerCase()) {
            setEmailSuccess("No changes to save.");
            setTimeout(() => setEmailSuccess(""), 2000);
            return;
        }

        setEmailError("");
        try {
            setSavingEmail(true);
            const updated = await updateEmail(email.trim().toLowerCase());
            updateUser({ email: updated });
            setEmailSuccess("Email updated successfully!");
            setTimeout(() => setEmailSuccess(""), 3000);
        } catch (err) {
            setEmailError(err instanceof Error ? err.message : "Failed to update email");
        } finally {
            setSavingEmail(false);
        }
    };

    // Change Password handler — require all fields filled
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordSuccess("");

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setPasswordErrors({ current: !currentPassword ? "Required" : undefined, new: !newPassword ? "Required" : undefined, confirm: !confirmNewPassword ? "Required" : undefined });
            return;
        }

        const curErr = validatePassword(currentPassword);
        const newErr = validatePassword(newPassword);
        let matchErr: string | null = null;
        if (newPassword !== confirmNewPassword) {
            matchErr = "New passwords do not match";
        }
        if (currentPassword === newPassword) {
            matchErr = "New password must differ from current password";
        }

        if (curErr || newErr || matchErr) {
            setPasswordErrors({
                ...(curErr && { current: curErr }),
                ...(newErr && { new: newErr }),
                ...(matchErr && { confirm: matchErr }),
            });
            return;
        }

        setPasswordErrors({});
        try {
            setSavingPassword(true);
            await changePassword(currentPassword, newPassword);
            setPasswordSuccess("Password changed successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setTimeout(() => setPasswordSuccess(""), 3500);
        } catch (err) {
            setPasswordErrors({
                current: err instanceof Error ? err.message : "Failed to change password",
            });
        } finally {
            setSavingPassword(false);
        }
    };

    if (!user) return null;

    const currentAvatarUrl = user.avatarUrl || DEFAULT_AVATAR;

    // Dirty flags — buttons disabled when nothing changed
    const nameDirty = firstName.trim() !== (user.name?.firstName || "").trim() || (lastName.trim() || "") !== (user.name?.lastName || "").trim();
    const bioDirty = (bio.trim() || "") !== (user.bio || "").trim();
    const emailDirty = email.trim().toLowerCase() !== (user.email || "").trim().toLowerCase();
    const passwordFilled = !!(currentPassword && newPassword && confirmNewPassword);

    return (
        <div className="min-h-screen w-full bg-background bg-ambient-glow text-foreground flex flex-col items-center">
            {/* Top Navigation Bar */}
            <header className="w-full border-b border-border/80 bg-card/70 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-[760px] mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/")}
                            className="size-9 text-muted-foreground hover:text-foreground"
                            aria-label="Back to conversations"
                        >
                            <ArrowLeft className="size-4" />
                        </Button>
                        <div>
                            <h1 className="text-[17px] font-bold leading-none tracking-tight text-foreground">
                                Profile Settings
                            </h1>
                            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                                Manage identity, security & preferences
                            </p>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                            await logout();
                            navigate("/login");
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
                    >
                        <LogOut className="size-3.5" />
                        <span className="hidden sm:inline">Sign Out</span>
                    </Button>
                </div>
            </header>

            {/* Fullscreen Avatar Lightbox Modal */}
            <AnimatePresence>
                {showFullAvatar && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowFullAvatar(false)}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-[420px] w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                        >
                            <img
                                src={currentAvatarUrl}
                                alt={user.username}
                                className="w-full h-auto object-cover max-h-[75vh]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowFullAvatar(false)}
                                className="absolute top-3 right-3 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
                            >
                                <X className="size-4" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="w-full max-w-[760px] px-4 py-8 flex flex-col gap-6">
                {/* Hero Profile Showcase Card */}
                <div className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Avatar with click-to-zoom + upload overlay */}
                    <div className="relative group shrink-0">
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                        />

                        <div className="relative size-24 sm:size-28 rounded-full overflow-hidden border-2 border-border shadow-md ring-4 ring-primary/10">
                            <img
                                src={currentAvatarUrl}
                                alt={user.username}
                                className="size-full object-cover"
                            />

                            {/* Hover overlay with zoom and upload icons */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowFullAvatar(true)}
                                    className="size-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                                    title="View full picture"
                                >
                                    <Maximize2 className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    className="size-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                                    title="Upload new photo"
                                >
                                    <Camera className="size-4" />
                                </button>
                            </div>

                            {uploadingAvatar && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-semibold">
                                    <Loader2 className="size-5 animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Profile Header Details */}
                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
                                {user.name?.firstName
                                    ? `${user.name.firstName} ${user.name.lastName || ""}`.trim()
                                    : `@${user.username}`}
                            </h2>
                            {/* Verified locked handle pill with copy button */}
                            <button
                                type="button"
                                onClick={handleCopyHandle}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 hover:bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all mx-auto sm:mx-0 w-fit"
                                title="Click to copy handle"
                            >
                                <span>@{user.username}</span>
                                {copiedHandle ? (
                                    <Check className="size-3 text-emerald-500 stroke-3" />
                                ) : (
                                    <Copy className="size-3 opacity-60" />
                                )}
                            </button>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
                            {user.bio || "No bio added yet. Add a short bio to introduce yourself to your contacts."}
                        </p>

                        {/* Avatar Action Button */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={uploadingAvatar}
                                onClick={() => fileInputRef.current?.click()}
                                className="h-8 text-xs font-medium gap-1.5 rounded-xl"
                            >
                                <Camera className="size-3" />
                                <span>Change Photo</span>
                            </Button>
                        </div>

                        {avatarError && (
                            <p className="text-xs text-destructive font-medium pt-1">
                                {avatarError}
                            </p>
                        )}
                        {avatarSuccess && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                                {avatarSuccess}
                            </p>
                        )}
                    </div>
                </div>

                {/* Section Navigation Tabs */}
                <div className="flex items-center gap-2 p-1 rounded-2xl bg-card border border-border/80 shadow-2xs">
                    <button
                        type="button"
                        onClick={() => setActiveTab("general")}
                        className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                            activeTab === "general"
                                ? "bg-gradient-chat-sender text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        General Info
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("security")}
                        className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                            activeTab === "security"
                                ? "bg-gradient-chat-sender text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Security & Email
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("blocked")}
                        className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                            activeTab === "blocked"
                                ? "bg-gradient-chat-sender text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Blocked Users
                    </button>
                </div>

                {/* TAB 1: GENERAL INFO (Name & Bio) */}
                {activeTab === "general" && (
                    <div className="space-y-6">
                        {/* Display Name Card */}
                        <div className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-foreground">
                                        Display Name
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Update your public first and last name.
                                    </p>
                                </div>
                                <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full font-medium">
                                    1–50 characters
                                </span>
                            </div>

                            <form onSubmit={handleSaveName} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="prof-firstname" className="text-xs font-semibold">
                                            First Name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="prof-firstname"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Alex"
                                            className="h-11 rounded-xl bg-card"
                                        />
                                        {nameErrors.firstName && (
                                            <p className="text-xs text-destructive font-medium">
                                                {nameErrors.firstName}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="prof-lastname" className="text-xs font-semibold">
                                                Last Name
                                            </Label>
                                            <span className="text-[10px] text-muted-foreground">Optional</span>
                                        </div>
                                        <Input
                                            id="prof-lastname"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Smith"
                                            className="h-11 rounded-xl bg-card"
                                        />
                                        {nameErrors.lastName && (
                                            <p className="text-xs text-destructive font-medium">
                                                {nameErrors.lastName}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    {nameSuccess ? (
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                            {nameSuccess}
                                        </span>
                                    ) : <div />}
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={savingName || !nameDirty}
                                        className="h-9 px-4 rounded-xl font-semibold bg-gradient-chat-sender text-white shadow-xs disabled:opacity-40"
                                    >
                                        {savingName ? "Saving…" : "Save Name"}
                                    </Button>
                                </div>
                            </form>
                        </div>

                        {/* Bio Card */}
                        <div className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-foreground">
                                        About / Bio
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        A brief introduction shown when contacts view your profile.
                                    </p>
                                </div>
                                <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full font-medium">
                                    {bio.length} / 200
                                </span>
                            </div>

                            <form onSubmit={handleSaveBio} className="space-y-4">
                                <textarea
                                    rows={3}
                                    value={bio}
                                    maxLength={200}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Write something about yourself..."
                                    className="w-full rounded-2xl border border-border bg-card p-3 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none resize-none transition-all"
                                />

                                {bioError && (
                                    <p className="text-xs text-destructive font-medium">
                                        {bioError}
                                    </p>
                                )}

                                <div className="flex items-center justify-between pt-1">
                                    {bioSuccess ? (
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                            {bioSuccess}
                                        </span>
                                    ) : <div />}
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={savingBio || !bioDirty}
                                        className="h-9 px-4 rounded-xl font-semibold bg-gradient-chat-sender text-white shadow-xs disabled:opacity-40"
                                    >
                                        {savingBio ? "Saving…" : "Save Bio"}
                                    </Button>
                                </div>
                            </form>
                        </div>

                        {/* Permanent Username Notice Card */}
                        <div className="rounded-3xl border border-border/60 bg-secondary/40 p-5 flex items-start gap-3.5">
                            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                <Shield className="size-4" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-bold text-foreground">
                                    Username is permanent (@{user.username})
                                </h4>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    To ensure message delivery integrity, user handles cannot be changed after registration.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: SECURITY & EMAIL */}
                {activeTab === "security" && (
                    <div className="space-y-6">
                        {/* Email Address Update */}
                        <div className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-foreground">
                                        Email Address
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Used for account login and notifications.
                                    </p>
                                </div>
                                <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full font-medium">
                                    13–30 characters
                                </span>
                            </div>

                            <form onSubmit={handleSaveEmail} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="prof-email" className="text-xs font-semibold">
                                        Email
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                        <Input
                                            id="prof-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="alex@example.com"
                                            className="pl-10 h-11 rounded-xl bg-card"
                                        />
                                    </div>
                                    {emailError && (
                                        <p className="text-xs text-destructive font-medium">
                                            {emailError}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    {emailSuccess ? (
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                            {emailSuccess}
                                        </span>
                                    ) : <div />}
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={savingEmail || !emailDirty}
                                        className="h-9 px-4 rounded-xl font-semibold bg-gradient-chat-sender text-white shadow-xs disabled:opacity-40"
                                    >
                                        {savingEmail ? "Saving…" : "Update Email"}
                                    </Button>
                                </div>
                            </form>
                        </div>

                        {/* Password Change */}
                        <div className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-sm space-y-4">
                            <div>
                                <h3 className="text-base font-bold text-foreground">
                                    Change Password
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Ensure your account is protected with a strong 8–16 character password.
                                </p>
                            </div>

                            <form onSubmit={handleChangePassword} className="space-y-4">
                                {/* Current Password */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="prof-currpass" className="text-xs font-semibold">
                                        Current Password
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                        <Input
                                            id="prof-currpass"
                                            type={showCurrentPass ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="Enter current password"
                                            className="pl-10 pr-10 h-11 rounded-xl bg-card"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPass(!showCurrentPass)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showCurrentPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                    {passwordErrors.current && (
                                        <p className="text-xs text-destructive font-medium">
                                            {passwordErrors.current}
                                        </p>
                                    )}
                                </div>

                                {/* New Password */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="prof-newpass" className="text-xs font-semibold">
                                            New Password
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                            <Input
                                                id="prof-newpass"
                                                type={showNewPass ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="8–16 characters"
                                                className="pl-10 pr-10 h-11 rounded-xl bg-card"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPass(!showNewPass)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showNewPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                        {passwordErrors.new && (
                                            <p className="text-xs text-destructive font-medium">
                                                {passwordErrors.new}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="prof-confnewpass" className="text-xs font-semibold">
                                            Confirm New Password
                                        </Label>
                                        <div className="relative">
                                            <CheckCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                            <Input
                                                id="prof-confnewpass"
                                                type={showNewPass ? "text" : "password"}
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                placeholder="Re-enter new password"
                                                className="pl-10 h-11 rounded-xl bg-card"
                                            />
                                        </div>
                                        {passwordErrors.confirm && (
                                            <p className="text-xs text-destructive font-medium">
                                                {passwordErrors.confirm}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    {passwordSuccess ? (
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                            {passwordSuccess}
                                        </span>
                                    ) : <div />}
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={savingPassword || !passwordFilled}
                                        className="h-9 px-4 rounded-xl font-semibold bg-gradient-chat-sender text-white shadow-xs disabled:opacity-40"
                                    >
                                        {savingPassword ? "Updating…" : "Change Password"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* TAB 3: BLOCKED USERS */}
                {activeTab === "blocked" && (
                    <>
                    <div className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-base font-bold text-foreground">
                                Blocked Users
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Contacts on your blocklist cannot send you messages or see your presence.
                            </p>
                        </div>

                        {loadingBlocked ? (
                            <div className="py-8 flex justify-center text-muted-foreground">
                                <Loader2 className="size-6 animate-spin" />
                            </div>
                        ) : blockedUsers.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground text-xs italic">
                                You haven&apos;t blocked any contacts.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {blockedUsers.map((bUser) => (
                                    <div
                                        key={bUser._id}
                                        className="flex items-center justify-between p-3 rounded-2xl bg-secondary/50 border border-border/60"
                                    >
                                        <div
                                            className="flex items-center gap-3 cursor-pointer group min-w-0"
                                            onClick={() => { setViewingBlockedUser(bUser); setCopiedBlockedHandle(false); }}
                                            title="View profile"
                                        >
                                            <img
                                                src={bUser.avatarUrl || DEFAULT_AVATAR}
                                                alt={bUser.username}
                                                className="size-10 rounded-full object-cover border border-border group-hover:ring-2 group-hover:ring-primary/40 transition-all shrink-0"
                                            />
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                                    {bUser.name?.firstName
                                                        ? `${bUser.name.firstName} ${bUser.name.lastName || ""}`.trim()
                                                        : `@${bUser.username}`}
                                                </h4>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    @{bUser.username}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={unblockingUserId === bUser._id}
                                            onClick={() => handleUnblock(bUser._id)}
                                            className="h-8 text-xs font-semibold gap-1.5 rounded-xl hover:text-emerald-500 hover:border-emerald-500/40 shrink-0"
                                        >
                                            {unblockingUserId === bUser._id ? (
                                                <Loader2 className="size-3 animate-spin" />
                                            ) : (
                                                <>
                                                    <UserCheck className="size-3.5" />
                                                    <span>Unblock</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Blocked User Profile Modal */}
                    <AnimatePresence>
                        {viewingBlockedUser && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setViewingBlockedUser(null)}
                                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full max-w-sm rounded-3xl bg-card border border-border/80 p-6 shadow-2xl space-y-5 relative"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setViewingBlockedUser(null)}
                                        className="absolute top-4 right-4 size-8 rounded-full bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                                    >
                                        <X className="size-4" />
                                    </button>

                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div
                                            onClick={() => setShowBlockedUserDp(true)}
                                            className="relative group size-28 rounded-full overflow-hidden border-2 border-border shadow-md cursor-pointer ring-4 ring-primary/10"
                                            title="View full picture"
                                        >
                                            <img
                                                src={viewingBlockedUser.avatarUrl || DEFAULT_AVATAR}
                                                alt={viewingBlockedUser.username}
                                                className="size-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                <Maximize2 className="size-5" />
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold text-foreground">
                                                {viewingBlockedUser.name?.firstName
                                                    ? `${viewingBlockedUser.name.firstName} ${viewingBlockedUser.name.lastName || ""}`.trim()
                                                    : `@${viewingBlockedUser.username}`}
                                            </h3>
                                            <div className="mt-1 flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyBlockedHandle(viewingBlockedUser.username)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                                                    title="Click to copy handle"
                                                >
                                                    <span>@{viewingBlockedUser.username}</span>
                                                    {copiedBlockedHandle ? (
                                                        <Check className="size-3 text-emerald-500 stroke-3" />
                                                    ) : (
                                                        <Copy className="size-3 opacity-60" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-destructive/10 text-[11px] font-medium text-destructive">
                                            Blocked
                                        </span>
                                    </div>

                                    {viewingBlockedUser.bio && (
                                        <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 text-xs text-muted-foreground leading-relaxed">
                                            <span className="font-semibold text-foreground block mb-0.5">Bio:</span>
                                            {viewingBlockedUser.bio}
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            variant="outline"
                                            className="flex-1 rounded-xl text-xs font-semibold"
                                            onClick={() => setShowBlockedUserDp(true)}
                                        >
                                            <Maximize2 className="size-3.5 mr-1.5" />
                                            <span>View Photo</span>
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="flex-1 rounded-xl text-xs font-semibold"
                                            disabled={unblockingUserId === viewingBlockedUser._id}
                                            onClick={() => {
                                                handleUnblock(viewingBlockedUser._id);
                                                setViewingBlockedUser(null);
                                            }}
                                        >
                                            <UserCheck className="size-3.5 mr-1.5" />
                                            <span>Unblock</span>
                                        </Button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Blocked User Full DP Lightbox */}
                    <AnimatePresence>
                        {showBlockedUserDp && viewingBlockedUser && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowBlockedUserDp(false)}
                                className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 cursor-zoom-out"
                            >
                                <motion.div
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.9 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="relative max-w-105 w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                                >
                                    <img
                                        src={viewingBlockedUser.avatarUrl || DEFAULT_AVATAR}
                                        alt={viewingBlockedUser.username}
                                        className="w-full h-auto object-cover max-h-[75vh]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowBlockedUserDp(false)}
                                        className="absolute top-3 right-3 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    </>
                )}
            </main>
        </div>
    );
};

export default Profile;