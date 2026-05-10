import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LoginPage from "../assets/pages/LoginPage.jsx";
import RegisterPage from "../assets/pages/RegisterPage.jsx";

type AuthUser = {
  id?: number;
  username?: string;
  email?: string;
  role?: string;
  bio?: string;
  favoritePlayer?: string;
  favoriteTeam?: string;
};

const validateNewPassword = (password: string) => {
  if (!password) return "";
  if (password.length < 8) return "Weak password: it must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Weak password: include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Weak password: include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Weak password: include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Weak password: include at least one special character.";
  return "";
};

// Shared dark-aware input class
const inputCls =
  "w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700";

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

  // Focus management
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const loginBtnRef   = useRef<HTMLButtonElement>(null);
  const authModalRef  = useRef<HTMLDivElement>(null);
  const profileModalRef = useRef<HTMLDivElement>(null);

  const currentUserLabel = useMemo(
    () => user?.username || user?.email || "User",
    [user]
  );

  // ── Sync user ────────────────────────────────────────────────────────────
  useEffect(() => {
    const syncUser = () => {
      const rawUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      if (!rawUser || !token) { localStorage.removeItem("user"); setUser(null); return; }
      try { setUser(JSON.parse(rawUser)); } catch { setUser(null); }
    };
    syncUser();
    window.addEventListener("auth-changed", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("auth-changed", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  // ── Pre-fill profile form ─────────────────────────────────────────────
  useEffect(() => {
    if (!profileOpen || !user) return;
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

  // ── Focus trap helper ─────────────────────────────────────────────────
  const makeFocusTrap = useCallback(
    (modalRef: React.RefObject<HTMLDivElement | null>, onClose: () => void) =>
      (e: KeyboardEvent) => {
        if (e.key === "Escape") { onClose(); return; }
        if (e.key !== "Tab" || !modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      },
    []
  );

  // ── Keyboard handling for auth modal ─────────────────────────────────
  useEffect(() => {
    if (!authModalOpen) { loginBtnRef.current?.focus(); return; }
    authModalRef.current?.focus();
    const handler = makeFocusTrap(authModalRef, () => setAuthModalOpen(false));
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [authModalOpen, makeFocusTrap]);

  // ── Keyboard handling for profile modal ──────────────────────────────
  useEffect(() => {
    if (!profileOpen) { profileBtnRef.current?.focus(); return; }
    profileModalRef.current?.focus();
    const handler = makeFocusTrap(profileModalRef, () => setProfileOpen(false));
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [profileOpen, makeFocusTrap]);

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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm((cur) => ({ ...cur, [name]: value }));
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) { setProfileMessage("Could not find your account email for this session."); return; }
    const passwordError = validateNewPassword(profileForm.newPassword);
    if (passwordError) { setProfileMessage(passwordError); return; }

    setIsSavingProfile(true);
    setProfileMessage("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5001/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          username: profileForm.username,
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) { setProfileMessage(data.message || "Could not update profile."); return; }

      const nextUser = {
        ...user,
        ...data.user,
        bio: profileForm.bio,
        favoritePlayer: profileForm.favoritePlayer,
        favoriteTeam: profileForm.favoriteTeam,
      };
      localStorage.setItem("user", JSON.stringify(nextUser));
      setUser(nextUser);
      setProfileForm((cur) => ({ ...cur, currentPassword: "", newPassword: "" }));
      setProfileMessage("Profile updated successfully.");
      window.dispatchEvent(new Event("auth-changed"));
    } catch (err) {
      console.error("Profile update error:", err);
      setProfileMessage("Could not connect to server. Make sure the backend is running on port 5001.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Shared modal backdrop + panel wrapper ────────────────────────────
  const Backdrop = ({ onClose, children }: { onClose: () => void; children: React.ReactNode }) => (
    <div
      className="fixed inset-0 z-9999 overflow-y-auto bg-black/70 px-4 py-10"
      onClick={onClose}
      // Prevent the backdrop from being read as interactive by screen readers —
      // the close button inside the modal is the accessible escape hatch.
      aria-hidden={false}
    >
      {children}
    </div>
  );

  // ── Shared panel close button ─────────────────────────────────────────
  const CloseBtn = ({ onClose, label }: { onClose: () => void; label: string }) => (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="
        shrink-0 border-2 border-black px-3 py-2 text-xs font-black uppercase tracking-[0.2em]
        transition-all hover:bg-black hover:text-white
        focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
        dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-600
      "
    >
      ✕
    </button>
  );

  return (
    <>
      {/* ── Nav controls ─────────────────────────────────────────────────── */}
      {user ? (
        <div className="flex items-center gap-2">
          <button
            ref={profileBtnRef}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setProfileOpen(true)}
            className="
              border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.2em]
              transition-all hover:bg-black hover:text-white
              focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
              dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-600
            "
          >
            {currentUserLabel}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="
              border-2 border-black bg-yellow-400 px-4 py-2 text-xs font-black tracking-[0.2em] text-black
              transition-all hover:bg-white
              focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
            "
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            ref={loginBtnRef}
            type="button"
            aria-haspopup="dialog"
            onClick={() => openModal("login")}
            className="
              border-2 border-black bg-white px-4 py-2 text-xs font-black tracking-[0.2em] text-black
              transition-all hover:bg-black hover:text-white
              focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
              dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-600
            "
          >
            Login
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => openModal("register")}
            className="
              border-2 border-black bg-yellow-400 px-4 py-2 text-xs font-black tracking-[0.2em] text-black
              transition-all hover:bg-white
              focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
            "
          >
            Register
          </button>
        </div>
      )}

      {/* ── Auth modal ───────────────────────────────────────────────────── */}
      {authModalOpen
        ? createPortal(
            <Backdrop onClose={() => setAuthModalOpen(false)}>
              <div
                ref={authModalRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-heading"
                className="
                  mx-auto w-full max-w-md border-4 border-black bg-white p-6 text-black
                  shadow-[12px_12px_0_0_rgba(0,0,0,1)] outline-none
                  dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100
                "
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-zinc-400">
                      Sports Tracker
                    </p>
                    <h2 id="auth-modal-heading" className="text-2xl font-black tracking-tight">
                      {page === "login" ? "Welcome back" : "Create account"}
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      Press Escape or click outside to close.
                    </p>
                  </div>
                  <CloseBtn onClose={() => setAuthModalOpen(false)} label="Close authentication dialog" />
                </div>

                {/* Login / Register tab switcher */}
                <div role="tablist" aria-label="Authentication options" className="mb-4 flex gap-2">
                  <button
                    role="tab"
                    type="button"
                    aria-selected={page === "login"}
                    onClick={() => setPage("login")}
                    className={`flex-1 border-2 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] transition-all
                      focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
                      ${page === "login"
                        ? "border-black bg-black text-white dark:border-zinc-400 dark:bg-zinc-700"
                        : "border-slate-200 bg-slate-100 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                  >
                    Login
                  </button>
                  <button
                    role="tab"
                    type="button"
                    aria-selected={page === "register"}
                    onClick={() => setPage("register")}
                    className={`flex-1 border-2 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] transition-all
                      focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
                      ${page === "register"
                        ? "border-black bg-yellow-400 text-black"
                        : "border-slate-200 bg-slate-100 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                  >
                    Register
                  </button>
                </div>

                <div role="tabpanel" aria-label={page === "login" ? "Login form" : "Register form"}>
                  {page === "login"
                    ? <LoginPage apiBaseUrl="http://localhost:5001" />
                    : <RegisterPage apiBaseUrl="http://localhost:5001" />
                  }
                </div>
              </div>
            </Backdrop>,
            document.body
          )
        : null}

      {/* ── Profile modal ────────────────────────────────────────────────── */}
      {profileOpen && user
        ? createPortal(
            <Backdrop onClose={() => setProfileOpen(false)}>
              <div
                ref={profileModalRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-modal-heading"
                className="
                  mx-auto w-full max-w-2xl border-4 border-black bg-white p-6 text-black
                  shadow-[12px_12px_0_0_rgba(0,0,0,1)] outline-none
                  dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100
                "
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-zinc-400">
                      Sports Tracker
                    </p>
                    <h2 id="profile-modal-heading" className="text-2xl font-black tracking-tight">
                      Your profile
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      Update your name, password, and profile preferences.
                    </p>
                    <p className="mt-2 inline-block border-2 border-black bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-black dark:border-yellow-500">
                      Role: {user.role || "user"}
                    </p>
                  </div>
                  <CloseBtn onClose={() => setProfileOpen(false)} label="Close profile dialog" />
                </div>

                <form className="grid gap-6 md:grid-cols-2" onSubmit={handleProfileSave}>
                  {/* Left column */}
                  <div className="space-y-4">
                    {[
                      { id: "profile-username", name: "username", label: "Username", type: "text", value: profileForm.username, placeholder: "" },
                      { id: "profile-favoritePlayer", name: "favoritePlayer", label: "Favorite Player", type: "text", value: profileForm.favoritePlayer, placeholder: "Lionel Messi" },
                      { id: "profile-favoriteTeam", name: "favoriteTeam", label: "Favorite Team", type: "text", value: profileForm.favoriteTeam, placeholder: "Barcelona" },
                    ].map(({ id, name, label, type, value, placeholder }) => (
                      <div key={id} className="space-y-2">
                        <label htmlFor={id} className="block text-xs font-black uppercase tracking-[0.2em] dark:text-zinc-300">
                          {label}
                        </label>
                        <input
                          id={id}
                          className={inputCls}
                          name={name}
                          type={type}
                          value={value}
                          onChange={handleProfileChange}
                          placeholder={placeholder}
                        />
                      </div>
                    ))}

                    <div className="space-y-2">
                      <label htmlFor="profile-bio" className="block text-xs font-black uppercase tracking-[0.2em] dark:text-zinc-300">
                        Bio
                      </label>
                      <textarea
                        id="profile-bio"
                        className={`min-h-28 ${inputCls}`}
                        name="bio"
                        value={profileForm.bio}
                        onChange={handleProfileChange}
                        placeholder="Tell people what kind of sports fan you are."
                      />
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="profile-email" className="block text-xs font-black uppercase tracking-[0.2em] dark:text-zinc-300">
                        Email
                      </label>
                      <input
                        id="profile-email"
                        className="w-full border-2 border-black bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-400"
                        value={user.email || ""}
                        disabled
                        aria-readonly="true"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="profile-currentPassword" className="block text-xs font-black uppercase tracking-[0.2em] dark:text-zinc-300">
                        Current Password
                      </label>
                      <input
                        id="profile-currentPassword"
                        className={inputCls}
                        name="currentPassword"
                        type="password"
                        value={profileForm.currentPassword}
                        onChange={handleProfileChange}
                        placeholder="Required only if changing password"
                        autoComplete="current-password"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="profile-newPassword" className="block text-xs font-black uppercase tracking-[0.2em] dark:text-zinc-300">
                        New Password
                      </label>
                      <input
                        id="profile-newPassword"
                        className={inputCls}
                        name="newPassword"
                        type="password"
                        value={profileForm.newPassword}
                        onChange={handleProfileChange}
                        placeholder="Leave blank to keep current password"
                        autoComplete="new-password"
                        aria-describedby="password-hint"
                      />
                      <p id="password-hint" className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        Use 8+ characters with uppercase, lowercase, a number, and a special character.
                      </p>
                    </div>

                    <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                      Profile extras like bio and favorites are saved for this demo session. Username and password changes are sent to the backend.
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="space-y-4 md:col-span-2">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="
                        w-full border-2 border-black bg-yellow-400 px-4 py-3 text-xs font-black
                        uppercase tracking-[0.2em] text-black transition-all
                        hover:bg-black hover:text-white
                        focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
                        disabled:opacity-50
                      "
                    >
                      {isSavingProfile ? "Saving Profile…" : "Save Profile"}
                    </button>

                    {profileMessage && (
                      <p role="status" aria-live="polite" className="text-sm font-semibold dark:text-zinc-300">
                        {profileMessage}
                      </p>
                    )}
                  </div>
                </form>
              </div>
            </Backdrop>,
            document.body
          )
        : null}
    </>
  );
}

export default LoginRegister;