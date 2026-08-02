import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { uploadAvatar, updateBio, updateUsername } from "../api/user.api";
const Profile = () => {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Placeholders for future API hooks
    const [bio, setBio] = useState("");
    const [username, setUsername] = useState(user?.username || "");
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [isEditingUsername, setIsEditingUsername] = useState(false);


    const [savingBio, setSavingBio] = useState(false);
    const [bioError, setBioError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState("");

    const [savingUsername, setSavingUsername] = useState(false);
    const [usernameError, setUsernameError] = useState("");
    const [confirmingUsername, setConfirmingUsername] = useState(false);
    // AuthContext doesn't have usernameLocked or bio yet, assuming false/empty for shell
    const usernameLocked = false;

    const handleSaveUsername = async () => {
        try {
            setUsernameError("");
            setSavingUsername(true);
            const updatedUsername = await updateUsername(username);
            updateUser({ username: updatedUsername, usernameLocked: true });
            setIsEditingUsername(false);
            setConfirmingUsername(false);
        } catch (error) {
            console.error("Failed to update username:", error);
            setUsernameError(error instanceof Error ? error.message : "Failed to save username");
        } finally {
            setSavingUsername(false);
        }
    };

    const handleSaveBio = async () => {
        try {
            setBioError("");
            setSavingBio(true);
            const updatedBio = await updateBio(bio);
            updateUser({ bio: updatedBio });
            setIsEditingBio(false);
        } catch (error) {
            console.error("Failed to update bio:", error);
            setBioError(error instanceof Error ? error.message : "Failed to save bio");
        } finally {
            setSavingBio(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;

            setAvatarError("");

            const validTypes = ["image/jpeg", "image/png", "image/webp"];
            if (!validTypes.includes(file.type)) {
                setAvatarError("Only JPEG, PNG, and WebP are allowed.");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                setAvatarError("File size cannot exceed 5MB.");
                return;
            }

            const objectUrl = URL.createObjectURL(file);
            setLocalAvatarPreview(objectUrl);
            setUploading(true);

            try {
                const newAvatarUrl = await uploadAvatar(file);
                updateUser({ avatarUrl: newAvatarUrl });
            } catch (error) {
                console.error("Avatar upload failed:", error);
                setAvatarError(error instanceof Error ? error.message : "Upload failed");
            } finally {
                setUploading(false);
                URL.revokeObjectURL(objectUrl);
                setLocalAvatarPreview(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        } catch (error) {
            console.error("File selection failed:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    if (!user) return null;

    return (
        <main style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
            <h1>Profile</h1>

            <div style={{ marginBottom: "20px" }}>
                <input
                    type="file"
                    accept="image/jpeg, image/png, image/webp"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />
                <div style={{ position: "relative", display: "inline-block" }}>
                    <img
                        src={localAvatarPreview || user.avatarUrl || "/default-avatar.png"}
                        alt="Avatar"
                        width={100}
                        height={100}
                        style={{
                            borderRadius: "50%",
                            cursor: uploading ? "not-allowed" : "pointer",
                            objectFit: "cover",
                            opacity: uploading ? 0.5 : 1
                        }}
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        title="Change Avatar"
                    />
                    {uploading && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "12px", pointerEvents: "none" }}>Uploading...</div>}
                </div>
                {avatarError && <p style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>{avatarError}</p>}
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: "bold" }}>Username</label>
                {isEditingUsername ? (
                    <div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={savingUsername || confirmingUsername}
                        />
                        {usernameError && <p style={{ color: "red", fontSize: "12px", margin: "4px 0" }}>{usernameError}</p>}

                        {confirmingUsername ? (
                            <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "4px" }}>
                                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#92400e" }}>
                                    Warning: You can only change your username once. Are you sure?
                                </p>
                                <button onClick={() => setConfirmingUsername(false)} disabled={savingUsername}>Cancel</button>
                                <button onClick={handleSaveUsername} disabled={savingUsername} style={{ marginLeft: "8px", backgroundColor: "#ef4444", color: "white", border: "none", padding: "4px 8px", cursor: "pointer" }}>
                                    {savingUsername ? "Saving..." : "Yes, Change It"}
                                </button>
                            </div>
                        ) : (
                            <div style={{ marginTop: "8px" }}>
                                <button onClick={() => setIsEditingUsername(false)}>Cancel</button>
                                <button onClick={() => setConfirmingUsername(true)} style={{ marginLeft: "8px" }}>Save</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <span>{user.username}</span>
                        {!user.usernameLocked && (
                            <button onClick={() => { setUsername(user.username); setIsEditingUsername(true); }} style={{ marginLeft: "10px" }}>
                                Edit
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: "bold" }}>Bio</label>
                {isEditingBio ? (
                    <div>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={3}
                            maxLength={200}
                            style={{ width: "100%", boxSizing: "border-box" }}
                        />
                        <div style={{ fontSize: "12px", color: bio.length >= 200 ? "red" : "gray", textAlign: "right", marginBottom: "8px" }}>
                            {bio.length}/200
                        </div>
                        {bioError && <p style={{ color: "red", fontSize: "12px", margin: "4px 0" }}>{bioError}</p>}
                        <button onClick={() => setIsEditingBio(false)} disabled={savingBio}>Cancel</button>
                        <button onClick={handleSaveBio} disabled={savingBio} style={{ marginLeft: "8px" }}>
                            {savingBio ? "Saving..." : "Save"}
                        </button>
                    </div>
                ) : (
                    <div>
                        <p>{user.bio || "No bio set."}</p>
                        <button onClick={() => { setBio(user.bio || ""); setIsEditingBio(true); }}>Edit</button>
                    </div>
                )}
            </div>

            <button
                onClick={handleLogout}
                style={{ backgroundColor: "#ef4444", color: "white", padding: "8px 16px", border: "none", cursor: "pointer" }}
            >
                Logout
            </button>
        </main>
    );
};

export default Profile;