import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AuthUser = {
  id?: number;
  username?: string;
  email?: string;
  role?: string;
};

type SystemConfig = {
  registrationEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt?: string;
  updatedBy?: number | null;
};

type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: "admin" | "user";
  disabled: boolean;
  createdAt?: string;
};

type ContentModeration = {
  homeHeroHeadline: string;
  homeHeroSubtext: string;
  featuredPlayers: string[];
  updatedAt?: string;
  updatedBy?: number | null;
};

type AuditEntry = {
  id: number;
  actionType: string;
  summary: string;
  actorUserId?: number | null;
  targetType: string;
  targetId?: string | null;
  createdAt: string;
};

type SessionEntry = {
  id: string;
  userId: number;
  label: string;
  createdAt: string;
  lastSeenAt: string;
  username: string;
  email: string;
  role: string;
};

const apiBaseUrl = "http://localhost:5001";

const emptyConfig: SystemConfig = {
  registrationEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: "",
};

const emptyContent: ContentModeration = {
  homeHeroHeadline: "",
  homeHeroSubtext: "",
  featuredPlayers: [],
};

// Shared input / textarea classes for both themes
const inputCls =
  "w-full border-2 border-black bg-white px-4 py-3 text-black outline-none focus:bg-yellow-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-100 dark:focus:bg-zinc-700 dark:placeholder:text-zinc-400";

function AdminConfigPanel() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [config, setConfig] = useState<SystemConfig>(emptyConfig);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [content, setContent] = useState<ContentModeration>(emptyContent);
  const [featuredPlayersInput, setFeaturedPlayersInput] = useState("");
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [search, setSearch] = useState("");
  const [systemMessage, setSystemMessage] = useState("");
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [contentMessage, setContentMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingSystem, setIsSavingSystem] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);

  // Focus management: return focus to trigger when modal closes
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ── Sync user ────────────────────────────────────────────────────────────
  useEffect(() => {
    const syncUser = () => {
      const rawUser = localStorage.getItem("user");
      if (!rawUser) { setUser(null); return; }
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

  // ── Focus trap & escape ──────────────────────────────────────────────────
  useEffect(() => {
    if (!modalOpen) {
      // Return focus to the button that opened the modal
      openBtnRef.current?.focus();
      return;
    }

    // Move focus into the modal
    modalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        return;
      }
      // Basic focus trap
      if (e.key !== "Tab" || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  const getToken = () => localStorage.getItem("token");

  const loadDashboard = useCallback(async (searchTerm = "") => {
    const token = getToken();
    if (!token) return;
    setIsLoading(true);
    setDashboardMessage("");
    try {
      const [configResponse, dashboardResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/system-config`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBaseUrl}/api/admin/dashboard?search=${encodeURIComponent(searchTerm)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const configData = await configResponse.json();
      const dashboardData = await dashboardResponse.json();
      if (!configResponse.ok) { setDashboardMessage(configData.message || "Could not load system configuration."); return; }
      if (!dashboardResponse.ok) { setDashboardMessage(dashboardData.message || "Could not load admin dashboard."); return; }
      setConfig(configData.config);
      setUsers(dashboardData.users || []);
      const nextContent = dashboardData.contentModeration || emptyContent;
      setContent(nextContent);
      setFeaturedPlayersInput((nextContent.featuredPlayers || []).join(", "));
      setAudits(dashboardData.audits || []);
      setSessions(dashboardData.sessions || []);
    } catch (error) {
      console.error("Admin dashboard load error:", error);
      setDashboardMessage("Could not connect to the backend on port 5001.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;
    loadDashboard("");
  }, [user, loadDashboard]);

  useEffect(() => {
    if (!modalOpen || !search.trim()) loadDashboard("");
  }, [search, modalOpen, loadDashboard]);

  // ── Change handlers ──────────────────────────────────────────────────────
  const handleSystemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const { name, value } = target;
    setConfig((cur) => ({
      ...cur,
      [name]: target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : value,
    }));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const { name, value } = target;
    if (name === "featuredPlayers") { setFeaturedPlayersInput(value); return; }
    setContent((cur) => ({
      ...cur,
      [name]: target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : value,
    }));
  };

  // ── Save handlers ────────────────────────────────────────────────────────
  const saveSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setIsSavingSystem(true);
    setSystemMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/system-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (!response.ok) { setSystemMessage(data.message || "Could not update system configuration."); return; }
      setConfig(data.config);
      setSystemMessage(data.message);
      window.dispatchEvent(new Event("auth-changed"));
      loadDashboard(search);
    } catch (err) {
      console.error(err);
      setSystemMessage("Could not connect to the backend on port 5001.");
    } finally {
      setIsSavingSystem(false);
    }
  };

  const saveContentModeration = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setIsSavingContent(true);
    setContentMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...content, featuredPlayers: featuredPlayersInput }),
      });
      const data = await response.json();
      if (!response.ok) { setContentMessage(data.message || "Could not update content moderation."); return; }
      setContent(data.contentModeration);
      setFeaturedPlayersInput((data.contentModeration?.featuredPlayers || []).join(", "));
      setContentMessage(data.message);
      loadDashboard(search);
    } catch (err) {
      console.error(err);
      setContentMessage("Could not connect to the backend on port 5001.");
    } finally {
      setIsSavingContent(false);
    }
  };

  const updateUserAccess = async (entry: AdminUser, changes: Partial<AdminUser>) => {
    const token = getToken();
    if (!token) return;
    setDashboardMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: changes.role ?? entry.role, disabled: changes.disabled ?? entry.disabled }),
      });
      const data = await response.json();
      if (!response.ok) { setDashboardMessage(data.message || "Could not update user access."); return; }
      setDashboardMessage(data.message);
      loadDashboard(search);
    } catch (err) {
      console.error(err);
      setDashboardMessage("Could not connect to the backend on port 5001.");
    }
  };

  const revokeSession = async (sessionId: string) => {
    const token = getToken();
    if (!token) return;
    setDashboardMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/sessions/${sessionId}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) { setDashboardMessage(data.message || "Could not revoke session."); return; }
      setDashboardMessage(data.message);
      loadDashboard(search);
    } catch (err) {
      console.error(err);
      setDashboardMessage("Could not connect to the backend on port 5001.");
    }
  };

  const deleteUserAccount = async (entry: AdminUser) => {
    const token = getToken();
    if (!token) return;
    setDashboardMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users/${entry.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) { setDashboardMessage(data.message || "Could not delete user account."); return; }
      setDashboardMessage(data.message);
      loadDashboard(search);
    } catch (err) {
      console.error(err);
      setDashboardMessage("Could not connect to the backend on port 5001.");
    }
  };

  if (!user || user.role !== "admin") return null;

  // ── Shared button style helpers ──────────────────────────────────────────
  const ghostBtn = "border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-600";
  const dangerBtn = "border-2 border-red-600 bg-red-600 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400";
  const solidBtn = "border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-yellow-400 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400 dark:border-zinc-600 dark:bg-zinc-700 dark:hover:bg-yellow-400 dark:hover:text-black";

  return (
    <>
      {/* ── Admin banner card ─────────────────────────────────────────────── */}
      <section
        aria-labelledby="admin-panel-heading"
        className="overflow-hidden border-4 border-black bg-white text-black shadow-[14px_14px_0_0_rgba(0,0,0,1)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[14px_14px_0_0_rgba(250,204,21,0.15)]"
      >
        <div className="border-b-4 border-black bg-yellow-400 px-6 py-6 text-black dark:border-zinc-700">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <p className="text-[11px] font-black uppercase tracking-[0.35em]">Admin Control Center</p>
              <h2 id="admin-panel-heading" className="mt-3 text-5xl font-black tracking-tight">
                Admin Settings
              </h2>
              <p className="mt-3 text-lg font-bold leading-8">
                Open a focused admin panel for user access, site controls, homepage content, and security activity.
              </p>
            </div>
            <button
              ref={openBtnRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={modalOpen}
              onClick={() => { loadDashboard(search); setModalOpen(true); }}
              className="border-4 border-black bg-black px-8 py-5 text-[11px] font-black uppercase tracking-[0.25em] text-white transition-all hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Admin Access
            </button>
          </div>
        </div>
      </section>

      {/* ── Modal portal ──────────────────────────────────────────────────── */}
      {modalOpen
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-modal-heading"
              className="fixed inset-0 z-9999 overflow-y-auto bg-black/70 px-4 py-10"
              onClick={() => setModalOpen(false)}
            >
              {/* Stop click propagation so clicking inside doesn't close */}
              <div
                ref={modalRef}
                tabIndex={-1}
                className="mx-auto w-full max-w-7xl border-4 border-black bg-white text-black shadow-[14px_14px_0_0_rgba(0,0,0,1)] outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                <div className="border-b-4 border-black bg-yellow-400 px-6 py-5 text-black dark:border-zinc-700">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-4xl">
                      <p className="text-[11px] font-black uppercase tracking-[0.35em]">Admin Control Center</p>
                      <h2 id="admin-modal-heading" className="mt-2 text-4xl font-black tracking-tight">
                        Admin Settings
                      </h2>
                      <p className="mt-2 text-sm font-bold text-black/80">
                        The most important admin controls for SportsTracker are grouped here.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close admin panel"
                      onClick={() => setModalOpen(false)}
                      className="border-4 border-black bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.25em] text-black hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="bg-white p-6 text-black dark:bg-zinc-900 dark:text-zinc-100">

                  {/* ── Summary stats ──────────────────────────────────────── */}
                  <dl className="mb-8 grid gap-4 md:grid-cols-3">
                    {[
                      { label: "Admin Role", value: user.role },
                      {
                        label: "Last Config Update",
                        value: config.updatedAt ? new Date(config.updatedAt).toLocaleString() : "No updates yet",
                      },
                      { label: "Updated By", value: String(config.updatedBy ?? "N/A") },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="border-2 border-black bg-yellow-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"
                      >
                        <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
                          {label}
                        </dt>
                        <dd className="mt-2 text-2xl font-black dark:text-zinc-100">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {/* ── System config form ─────────────────────────────────── */}
                  <section
                    aria-labelledby="system-config-heading"
                    className="border-4 border-black bg-slate-50 p-5 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <header className="mb-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
                        Access Control
                      </p>
                      <h3 id="system-config-heading" className="mt-2 text-3xl font-black">
                        Registration And Site State
                      </h3>
                      <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-zinc-400">
                        The core app-wide controls that affect who can use the system and what state the site is in.
                      </p>
                    </header>

                    <form className="grid gap-6 md:grid-cols-2" onSubmit={saveSystemConfig}>
                      {/* Checkboxes */}
                      {[
                        { name: "registrationEnabled", label: "Enable new user registration", checked: config.registrationEnabled },
                        { name: "maintenanceMode", label: "Maintenance mode", checked: config.maintenanceMode },
                      ].map(({ name, label, checked }) => (
                        <label
                          key={name}
                          className="flex cursor-pointer items-center justify-between border-2 border-black bg-yellow-50 px-4 py-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] dark:border-zinc-700 dark:bg-zinc-800"
                        >
                          <span className="text-lg font-black tracking-tight dark:text-zinc-100">{label}</span>
                          <input
                            className="h-6 w-6 accent-yellow-400"
                            type="checkbox"
                            name={name}
                            checked={checked}
                            onChange={handleSystemChange}
                          />
                        </label>
                      ))}

                      <label className="space-y-2">
                        <span className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700 dark:text-zinc-300">
                          Maintenance Message
                        </span>
                        <textarea
                          className={`min-h-36 ${inputCls}`}
                          name="maintenanceMessage"
                          value={config.maintenanceMessage}
                          onChange={handleSystemChange}
                          placeholder="Add an optional admin maintenance note for users."
                        />
                      </label>

                      {/* Status cards */}
                      <div className="grid gap-4 md:col-span-2 lg:grid-cols-3">
                        {[
                          { label: "Registration", value: config.registrationEnabled ? "Open" : "Locked" },
                          { label: "Maintenance", value: config.maintenanceMode ? "Enabled" : "Disabled" },
                          {
                            label: "Audit Timestamp",
                            value: config.updatedAt ? new Date(config.updatedAt).toLocaleString() : "No updates yet",
                            small: true,
                          },
                        ].map(({ label, value, small }) => (
                          <div
                            key={label}
                            className="border-2 border-black bg-yellow-50 p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] dark:border-zinc-700 dark:bg-zinc-800"
                          >
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
                              {label}
                            </p>
                            <p className={`mt-2 font-black dark:text-zinc-100 ${small ? "text-lg" : "text-4xl"}`}>
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3 md:col-span-2">
                        <button
                          type="submit"
                          disabled={isSavingSystem || isLoading}
                          className="w-full border-2 border-black bg-black px-4 py-5 text-base font-black uppercase tracking-[0.3em] text-white transition-all hover:bg-yellow-400 hover:text-black focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:hover:bg-yellow-400 dark:hover:text-black"
                        >
                          {isSavingSystem ? "Saving Configuration…" : "Save Configuration"}
                        </button>
                        {systemMessage && (
                          <p role="status" aria-live="polite" className="text-base font-semibold dark:text-zinc-300">
                            {systemMessage}
                          </p>
                        )}
                      </div>
                    </form>
                  </section>

                  {/* ── Secondary panels grid ──────────────────────────────── */}
                  <div className="mt-10 grid gap-8 xl:grid-cols-2">

                    {/* User management */}
                    <section
                      aria-labelledby="user-mgmt-heading"
                      className="border-4 border-black bg-slate-50 p-5 dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
                            User Management
                          </p>
                          <h3 id="user-mgmt-heading" className="mt-2 text-3xl font-black">
                            Accounts And Roles
                          </h3>
                        </div>
                        <div className="flex gap-2" role="search" aria-label="Search users">
                          <label htmlFor="user-search" className="sr-only">Search users</label>
                          <input
                            id="user-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search users"
                            className="border-2 border-black bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:bg-yellow-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-600"
                          />
                          <button
                            type="button"
                            onClick={() => loadDashboard(search)}
                            className="border-2 border-black bg-yellow-400 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-black hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
                          >
                            Search
                          </button>
                        </div>
                      </div>

                      <ul role="list" className="mt-5 space-y-3">
                        {users.map((entry) => (
                          <li key={entry.id}>
                            <article className="border-2 border-black bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-lg font-black dark:text-zinc-100">{entry.username}</p>
                                  <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">{entry.email}</p>
                                  <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
                                    {entry.disabled ? "Disabled" : "Active"}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {entry.id === 1 ? (
                                    <div className="border-2 border-black bg-yellow-100 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-black dark:border-zinc-600 dark:bg-yellow-900/40 dark:text-yellow-300">
                                      Primary Admin
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        aria-label={`Make ${entry.username} ${entry.role === "admin" ? "a regular user" : "an admin"}`}
                                        onClick={() => updateUserAccess(entry, { role: entry.role === "admin" ? "user" : "admin" })}
                                        className={ghostBtn}
                                      >
                                        Make {entry.role === "admin" ? "User" : "Admin"}
                                      </button>
                                      <button
                                        type="button"
                                        aria-label={`${entry.disabled ? "Enable" : "Disable"} ${entry.username}`}
                                        onClick={() => updateUserAccess(entry, { disabled: !entry.disabled })}
                                        className={solidBtn}
                                      >
                                        {entry.disabled ? "Enable" : "Disable"}
                                      </button>
                                      <button
                                        type="button"
                                        aria-label={`Delete ${entry.username}`}
                                        onClick={() => deleteUserAccount(entry)}
                                        className={dangerBtn}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </article>
                          </li>
                        ))}
                      </ul>
                    </section>

                    {/* Content moderation */}
                    <section
                      aria-labelledby="content-mod-heading"
                      className="border-4 border-black bg-slate-50 p-5 dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
                        Content Moderation
                      </p>
                      <h3 id="content-mod-heading" className="mt-2 text-3xl font-black">
                        Homepage Featured Content
                      </h3>
                      <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-zinc-400">
                        Keep this focused on the content your users actually see on the home page.
                      </p>

                      <form className="mt-5 space-y-4" onSubmit={saveContentModeration}>
                        <div className="space-y-1">
                          <label htmlFor="homeHeroHeadline" className="block text-xs font-black uppercase tracking-[0.2em] dark:text-zinc-300">
                            Homepage Headline
                          </label>
                          <input
                            id="homeHeroHeadline"
                            className={`text-lg font-bold ${inputCls}`}
                            name="homeHeroHeadline"
                            value={content.homeHeroHeadline}
                            onChange={handleContentChange}
                            placeholder="Homepage headline"
                          />
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="homeHeroSubtext" className="block text-xs font-black uppercase tracking-[0.2em] dark:text-zinc-300">
                            Homepage Subtext
                          </label>
                          <textarea
                            id="homeHeroSubtext"
                            className={`min-h-28 ${inputCls}`}
                            name="homeHeroSubtext"
                            value={content.homeHeroSubtext}
                            onChange={handleContentChange}
                            placeholder="Homepage subtext"
                          />
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="featuredPlayers" className="block text-xs font-black uppercase tracking-[0.2em] dark:text-zinc-300">
                            Featured Players
                          </label>
                          <input
                            id="featuredPlayers"
                            className={inputCls}
                            name="featuredPlayers"
                            value={featuredPlayersInput}
                            onChange={handleContentChange}
                            placeholder="Featured players, comma separated"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingContent}
                          className="w-full border-2 border-black bg-black px-4 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-yellow-400 hover:text-black focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:hover:bg-yellow-400 dark:hover:text-black"
                        >
                          {isSavingContent ? "Saving Content…" : "Save Content Controls"}
                        </button>
                        {contentMessage && (
                          <p role="status" aria-live="polite" className="text-sm font-semibold dark:text-zinc-300">
                            {contentMessage}
                          </p>
                        )}
                      </form>
                    </section>

                    {/* Audit & sessions */}
                    <section
                      aria-labelledby="audit-heading"
                      className="border-4 border-black bg-slate-50 p-5 dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
                        Audit And Security
                      </p>
                      <h3 id="audit-heading" className="mt-2 text-3xl font-black">
                        Audit Trail And Active Sessions
                      </h3>
                      <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-zinc-400">
                        Review recent admin actions and revoke sessions when you need to cut off access quickly.
                      </p>

                      <div className="mt-5 space-y-3">
                        <h4 className="text-lg font-black">Recent Audit Events</h4>
                        <ul role="list" className="space-y-3">
                          {audits.map((entry) => (
                            <li key={entry.id}>
                              <article className="border-2 border-black bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                                <p className="text-sm font-black dark:text-zinc-100">{entry.summary}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                                  {new Date(entry.createdAt).toLocaleString()} | {entry.actionType}
                                </p>
                              </article>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-6 space-y-3">
                        <h4 className="text-lg font-black">Active Sessions</h4>
                        <ul role="list" className="space-y-3">
                          {sessions.map((entry) => (
                            <li key={entry.id}>
                              <article className="border-2 border-black bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-black dark:text-zinc-100">
                                      {entry.username}{" "}
                                      <span className="font-semibold text-slate-500 dark:text-zinc-400">
                                        ({entry.role})
                                      </span>
                                    </p>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                                      Last seen {new Date(entry.lastSeenAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    aria-label={`Revoke session for ${entry.username}`}
                                    onClick={() => revokeSession(entry.id)}
                                    className={ghostBtn}
                                  >
                                    Revoke
                                  </button>
                                </div>
                              </article>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  </div>

                  {/* Dashboard-level status message */}
                  {dashboardMessage && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="mt-6 border-2 border-black bg-yellow-100 p-4 text-sm font-bold text-black dark:border-zinc-600 dark:bg-yellow-900/30 dark:text-yellow-200"
                    >
                      {dashboardMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export default AdminConfigPanel;