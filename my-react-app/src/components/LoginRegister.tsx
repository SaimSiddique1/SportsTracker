import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import LoginPage from "../assets/pages/LoginPage";
import RegisterPage from "../assets/pages/RegisterPage";

type AuthUser = {
  id?: number;
  username?: string;
  email?: string;
  bio?: string;
  favoritePlayer?: string;
  favoriteTeam?: string;
};

const validateNewPassword = (password: string) => {
  if (!password) {
    return "";
  }

  if (password.length < 8) {
    return "Weak password: it must be at least 8 characters long.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Weak password: include at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Weak password: include at least one lowercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Weak password: include at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Weak password: include at least one special character.";
  }

  return "";
};

function LoginRegister() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [page, setPage] = useState<"login" | "register">("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profileForm, setProfileForm] = useState({
    username: "",
    bio: "",
    favoritePlayer: "",
    favoriteTeam: "",
    currentPassword: "",
    newPassword: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const currentUserLabel = useMemo(
    () => user?.username || user?.email || "User",
    [user]
  );

  useEffect(() => {
    const syncUser = () => {
      const rawUser = localStorage.getItem("user");

      if (!rawUser) {
        setUser(null);
        return;
      }

      try {
        const parsedUser = JSON.parse(rawUser);
        setUser(parsedUser);
      } catch {
        setUser(null);
      }
    };

    syncUser();
    window.addEventListener("auth-changed", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("auth-changed", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    if (!profileOpen || !user) {
      return;
    }

    setProfileForm({
      username: user.username || "",
      bio: user.bio || "",
      favoritePlayer: user.favoritePlayer || "",
      favoriteTeam: user.favoriteTeam || "",
      currentPassword: "",
      newPassword: "",
    });
    setProfileMessage("");
  }, [profileOpen, user]);

  useEffect(() => {
    if (!authModalOpen && !profileOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAuthModalOpen(false);
        setProfileOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [authModalOpen, profileOpen]);

  const openModal = (nextPage: "login" | "register") => {
    setPage(nextPage);
    setAuthModalOpen(true);
    setProfileOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setAuthModalOpen(false);
    setProfileOpen(false);
  };

  const handleProfileChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.email) {
      setProfileMessage("Could not find your account email for this session.");
      return;
    }

    const passwordError = validateNewPassword(profileForm.newPassword);
    if (passwordError) {
      setProfileMessage(passwordError);
      return;
    }

    setIsSavingProfile(true);
    setProfileMessage("");

    try {
      const response = await fetch("http://localhost:5001/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          username: profileForm.username,
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProfileMessage(data.message || "Could not update profile.");
        return;
      }

      const nextUser = {
        ...user,
        ...data.user,
        bio: profileForm.bio,
        favoritePlayer: profileForm.favoritePlayer,
        favoriteTeam: profileForm.favoriteTeam,
      };

      localStorage.setItem("user", JSON.stringify(nextUser));
      setUser(nextUser);
      setProfileForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
      }));
      setProfileMessage("Profile updated successfully.");
      window.dispatchEvent(new Event("auth-changed"));
    } catch (error) {
      console.error("Profile update error:", error);
      setProfileMessage("Could not connect to server. Make sure the backend is running on port 5001.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <>
      {user ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProfileOpen(true)}
            className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-black hover:text-white"
          >
            {currentUserLabel}
          </button>
          <button
            onClick={handleLogout}
            className="border-2 border-black bg-yellow-400 px-4 py-2 text-xs font-black tracking-[0.2em] text-black transition-all hover:bg-white"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal("login")}
            className="border-2 border-black bg-white px-4 py-2 text-xs font-black tracking-[0.2em] text-black transition-all hover:bg-black hover:text-white"
          >
            Login
          </button>
          <button
            onClick={() => openModal("register")}
            className="border-2 border-black bg-yellow-400 px-4 py-2 text-xs font-black tracking-[0.2em] text-black transition-all hover:bg-white"
          >
            Register
          </button>
        </div>
      )}

      {authModalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] overflow-y-auto bg-black/70 px-4 py-10"
              onClick={() => setAuthModalOpen(false)}
            >
              <div
                className="mx-auto w-full max-w-md border-4 border-black bg-white p-6 text-black shadow-[12px_12px_0_0_rgba(0,0,0,1)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                      Sports Tracker
                    </p>
                    <h2 className="text-2xl font-black tracking-tight">
                      {page === "login" ? "Welcome back" : "Create account"}
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Press Escape or click outside this panel to close.
                    </p>
                  </div>
                  <button
                    onClick={() => setAuthModalOpen(false)}
                    aria-label="Close authentication dialog"
                    className="shrink-0 border-2 border-black px-3 py-2 text-xs font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white"
                  >
                    X
                  </button>
                </div>

                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => setPage("login")}
                    className={`flex-1 border-2 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                      page === "login"
                        ? "border-black bg-black text-white"
                        : "border-slate-200 bg-slate-100"
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setPage("register")}
                    className={`flex-1 border-2 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                      page === "register"
                        ? "border-black bg-yellow-400 text-black"
                        : "border-slate-200 bg-slate-100"
                    }`}
                  >
                    Register
                  </button>
                </div>

                {page === "login" ? (
                  <LoginPage apiBaseUrl="http://localhost:5001" />
                ) : (
                  <RegisterPage apiBaseUrl="http://localhost:5001" />
                )}
              </div>
            </div>,
            document.body
          )
        : null}

      {profileOpen && user
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] overflow-y-auto bg-black/70 px-4 py-10"
              onClick={() => setProfileOpen(false)}
            >
              <div
                className="mx-auto w-full max-w-2xl border-4 border-black bg-white p-6 text-black shadow-[12px_12px_0_0_rgba(0,0,0,1)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                      Sports Tracker
                    </p>
                    <h2 className="text-2xl font-black tracking-tight">Your profile</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Update your name, password, and profile preferences.
                    </p>
                  </div>
                  <button
                    onClick={() => setProfileOpen(false)}
                    aria-label="Close profile dialog"
                    className="shrink-0 border-2 border-black px-3 py-2 text-xs font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white"
                  >
                    X
                  </button>
                </div>

                <form className="grid gap-6 md:grid-cols-2" onSubmit={handleProfileSave}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-[0.2em]">
                        Username
                      </label>
                      <input
                        className="w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
                        name="username"
                        value={profileForm.username}
                        onChange={handleProfileChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-[0.2em]">
                        Bio
                      </label>
                      <textarea
                        className="min-h-28 w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
                        name="bio"
                        value={profileForm.bio}
                        onChange={handleProfileChange}
                        placeholder="Tell people what kind of sports fan you are."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-[0.2em]">
                        Favorite Player
                      </label>
                      <input
                        className="w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
                        name="favoritePlayer"
                        value={profileForm.favoritePlayer}
                        onChange={handleProfileChange}
                        placeholder="Lionel Messi"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-[0.2em]">
                        Favorite Team
                      </label>
                      <input
                        className="w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
                        name="favoriteTeam"
                        value={profileForm.favoriteTeam}
                        onChange={handleProfileChange}
                        placeholder="Barcelona"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-[0.2em]">
                        Email
                      </label>
                      <input
                        className="w-full border-2 border-black bg-slate-100 px-4 py-3 text-sm"
                        value={user.email || ""}
                        disabled
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-[0.2em]">
                        Current Password
                      </label>
                      <input
                        className="w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
                        name="currentPassword"
                        type="password"
                        value={profileForm.currentPassword}
                        onChange={handleProfileChange}
                        placeholder="Required only if changing password"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-[0.2em]">
                        New Password
                      </label>
                      <input
                        className="w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
                        name="newPassword"
                        type="password"
                        value={profileForm.newPassword}
                        onChange={handleProfileChange}
                        placeholder="Leave blank to keep current password"
                      />
                      <p className="text-[11px] font-semibold text-slate-500">
                        Use 8+ characters with uppercase, lowercase, a number, and a special character.
                      </p>
                    </div>

                    <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                      Profile extras like bio and favorites are saved for this demo session. Username and password changes are sent to the backend.
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <button
                      className="w-full border-2 border-black bg-yellow-400 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-black hover:text-white"
                      type="submit"
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? "Saving Profile..." : "Save Profile"}
                    </button>

                    {profileMessage ? (
                      <p className="text-sm font-semibold">{profileMessage}</p>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export default LoginRegister;
