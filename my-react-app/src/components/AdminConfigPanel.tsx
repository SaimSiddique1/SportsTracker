import { useCallback, useEffect, useState } from "react";
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

  useEffect(() => {
    const syncUser = () => {
      const rawUser = localStorage.getItem("user");

      if (!rawUser) {
        setUser(null);
        return;
      }

      try {
        setUser(JSON.parse(rawUser));
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

  const getToken = () => localStorage.getItem("token");

  const loadDashboard = useCallback(async (searchTerm = "") => {
    const token = getToken();
    if (!token) {
      return;
    }

    setIsLoading(true);
    setDashboardMessage("");

    try {
      const [configResponse, dashboardResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/system-config`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${apiBaseUrl}/api/admin/dashboard?search=${encodeURIComponent(searchTerm)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const configData = await configResponse.json();
      const dashboardData = await dashboardResponse.json();

      if (!configResponse.ok) {
        setDashboardMessage(configData.message || "Could not load system configuration.");
        return;
      }

      if (!dashboardResponse.ok) {
        setDashboardMessage(dashboardData.message || "Could not load admin dashboard.");
        return;
      }

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
    if (user?.role !== "admin") {
      return;
    }

    loadDashboard("");
  }, [user, loadDashboard]);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    if (!search.trim()) {
      loadDashboard("");
    }
  }, [search, modalOpen, loadDashboard]);

  const handleSystemChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    const { name, value } = target;
    setConfig((current) => ({
      ...current,
      [name]: target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : value,
    }));
  };

  const handleContentChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = event.currentTarget;
    const { name, value } = target;

    if (name === "featuredPlayers") {
      setFeaturedPlayersInput(value);
      return;
    }

    setContent((current) => ({
      ...current,
      [name]: target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : value,
    }));
  };

  const saveSystemConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      return;
    }

    setIsSavingSystem(true);
    setSystemMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/system-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      const data = await response.json();

      if (!response.ok) {
        setSystemMessage(data.message || "Could not update system configuration.");
        return;
      }

      setConfig(data.config);
      setSystemMessage(data.message);
      window.dispatchEvent(new Event("auth-changed"));
      loadDashboard(search);
    } catch (error) {
      console.error(error);
      setSystemMessage("Could not connect to the backend on port 5001.");
    } finally {
      setIsSavingSystem(false);
    }
  };

  const saveContentModeration = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      return;
    }

    setIsSavingContent(true);
    setContentMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/content`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...content,
          featuredPlayers: featuredPlayersInput,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setContentMessage(data.message || "Could not update content moderation.");
        return;
      }

      setContent(data.contentModeration);
      setFeaturedPlayersInput((data.contentModeration?.featuredPlayers || []).join(", "));
      setContentMessage(data.message);
      loadDashboard(search);
    } catch (error) {
      console.error(error);
      setContentMessage("Could not connect to the backend on port 5001.");
    } finally {
      setIsSavingContent(false);
    }
  };

  const updateUserAccess = async (entry: AdminUser, changes: Partial<AdminUser>) => {
    const token = getToken();
    if (!token) {
      return;
    }

    setDashboardMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users/${entry.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: changes.role ?? entry.role,
          disabled: changes.disabled ?? entry.disabled,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setDashboardMessage(data.message || "Could not update user access.");
        return;
      }

      setDashboardMessage(data.message);
      loadDashboard(search);
    } catch (error) {
      console.error(error);
      setDashboardMessage("Could not connect to the backend on port 5001.");
    }
  };

  const revokeSession = async (sessionId: string) => {
    const token = getToken();
    if (!token) {
      return;
    }

    setDashboardMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/sessions/${sessionId}/revoke`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setDashboardMessage(data.message || "Could not revoke session.");
        return;
      }

      setDashboardMessage(data.message);
      loadDashboard(search);
    } catch (error) {
      console.error(error);
      setDashboardMessage("Could not connect to the backend on port 5001.");
    }
  };

  const deleteUserAccount = async (entry: AdminUser) => {
    const token = getToken();
    if (!token) {
      return;
    }

    setDashboardMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users/${entry.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setDashboardMessage(data.message || "Could not delete user account.");
        return;
      }

      setDashboardMessage(data.message);
      loadDashboard(search);
    } catch (error) {
      console.error(error);
      setDashboardMessage("Could not connect to the backend on port 5001.");
    }
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <>
      <section className="overflow-hidden border-4 border-black bg-white text-black shadow-[14px_14px_0_0_rgba(0,0,0,1)]">
      <div className="border-b-4 border-black bg-yellow-400 px-6 py-6 text-black">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="text-[11px] font-black uppercase tracking-[0.35em]">
              Admin Control Center
            </p>
            <h3 className="mt-3 text-5xl font-black tracking-tight">
              Admin Settings
            </h3>
            <p className="mt-3 text-lg font-bold leading-8">
              Open a focused admin panel for user access, site controls, homepage content, and security activity.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadDashboard(search);
              setModalOpen(true);
            }}
            className="border-4 border-black bg-black px-8 py-5 text-[11px] font-black uppercase tracking-[0.25em] text-white transition-all hover:bg-white hover:text-black"
          >
            Admin Access
          </button>
        </div>
      </div>
      </section>

      {modalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] overflow-y-auto bg-black/70 px-4 py-10"
              onClick={() => setModalOpen(false)}
            >
              <div
                className="mx-auto w-full max-w-7xl border-4 border-black bg-white text-black shadow-[14px_14px_0_0_rgba(0,0,0,1)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="border-b-4 border-black bg-yellow-400 px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-4xl">
                      <p className="text-[11px] font-black uppercase tracking-[0.35em]">
                        Admin Control Center
                      </p>
                      <h4 className="mt-2 text-4xl font-black tracking-tight">
                        Admin Settings
                      </h4>
                      <p className="mt-2 text-sm font-bold text-black/80">
                        The most important admin controls for SportsTracker are grouped here.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="border-4 border-black bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.25em] text-black hover:bg-black hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="bg-white p-6 text-black">
                  <div className="mb-8 grid gap-4 md:grid-cols-3">
                    <div className="border-2 border-black bg-yellow-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Admin Role</p>
                      <p className="mt-2 text-2xl font-black">{user.role}</p>
                    </div>
                    <div className="border-2 border-black bg-yellow-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Last Config Update</p>
                      <p className="mt-2 text-lg font-black">
                        {config.updatedAt ? new Date(config.updatedAt).toLocaleString() : "No updates yet"}
                      </p>
                    </div>
                    <div className="border-2 border-black bg-yellow-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Updated By</p>
                      <p className="mt-2 text-2xl font-black">{config.updatedBy ?? "N/A"}</p>
                    </div>
                  </div>

                  <section className="border-4 border-black bg-slate-50 p-5">
                    <div className="mb-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Access Control</p>
                      <h5 className="mt-2 text-3xl font-black">Registration And Site State</h5>
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        The core app-wide controls that affect who can use the system and what state the site is in.
                      </p>
                    </div>
                  <form className="grid gap-6 md:grid-cols-2" onSubmit={saveSystemConfig}>
                    <label className="flex items-center justify-between border-2 border-black bg-yellow-50 px-4 py-4 text-sm font-bold text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                      <span className="text-lg font-black tracking-tight text-black">Enable new user registration</span>
                      <input
                        className="h-6 w-6 accent-blue-600"
                        type="checkbox"
                        name="registrationEnabled"
                        checked={config.registrationEnabled}
                        onChange={handleSystemChange}
                      />
                    </label>

                    <label className="flex items-center justify-between border-2 border-black bg-yellow-50 px-4 py-4 text-sm font-bold text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                      <span className="text-lg font-black tracking-tight text-black">Maintenance mode</span>
                      <input
                        className="h-6 w-6 accent-blue-600"
                        type="checkbox"
                        name="maintenanceMode"
                        checked={config.maintenanceMode}
                        onChange={handleSystemChange}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="block text-xs font-black uppercase tracking-[0.2em] text-slate-700">
                        Maintenance Message
                      </span>
                      <textarea
                        className="min-h-36 w-full border-2 border-black bg-white px-4 py-4 text-base font-semibold text-black outline-none focus:bg-yellow-50"
                        name="maintenanceMessage"
                        value={config.maintenanceMessage}
                        onChange={handleSystemChange}
                        placeholder="Add an optional admin maintenance note for users."
                      />
                    </label>

                    <div className="md:col-span-2 grid gap-4 lg:grid-cols-3">
                      <div className="border-2 border-black bg-yellow-50 p-4 text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Registration</p>
                        <p className="mt-2 text-4xl font-black text-black">{config.registrationEnabled ? "Open" : "Locked"}</p>
                      </div>

                      <div className="border-2 border-black bg-yellow-50 p-4 text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Maintenance</p>
                        <p className="mt-2 text-4xl font-black text-black">{config.maintenanceMode ? "Enabled" : "Disabled"}</p>
                      </div>

                      <div className="border-2 border-black bg-yellow-50 p-4 text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Audit Timestamp</p>
                        <p className="mt-2 text-lg font-black text-black">
                          {config.updatedAt ? new Date(config.updatedAt).toLocaleString() : "No updates yet"}
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <button
                        type="submit"
                        disabled={isSavingSystem || isLoading}
                        className="w-full border-2 border-black bg-black px-4 py-5 text-base font-black uppercase tracking-[0.3em] text-white transition-all hover:bg-yellow-400 hover:text-black"
                      >
                        {isSavingSystem ? "Saving Configuration..." : "Save Configuration"}
                      </button>
                      {systemMessage ? <p className="text-base font-semibold text-black">{systemMessage}</p> : null}
                    </div>
                  </form>
                  </section>

                  <div className="mt-10 grid gap-8 xl:grid-cols-2">
                    <section className="border-4 border-black bg-slate-50 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">User Management</p>
                <h5 className="mt-2 text-3xl font-black">Accounts And Roles</h5>
              </div>
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search users"
                  className="border-2 border-black bg-white px-3 py-2 text-sm font-semibold text-black"
                />
                <button
                  type="button"
                  onClick={() => loadDashboard(search)}
                  className="border-2 border-black bg-yellow-400 px-4 py-2 text-xs font-black uppercase tracking-[0.2em]"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {users.map((entry) => (
                <article key={entry.id} className="border-2 border-black bg-white p-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-lg font-black">{entry.username}</p>
                      <p className="text-sm font-semibold text-slate-600">{entry.email}</p>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                        {entry.disabled ? "Disabled" : "Active"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.id === 1 ? (
                        <div className="border-2 border-black bg-yellow-100 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-black">
                          Primary Admin
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => updateUserAccess(entry, { role: entry.role === "admin" ? "user" : "admin" })}
                            className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.2em]"
                          >
                            Make {entry.role === "admin" ? "User" : "Admin"}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateUserAccess(entry, { disabled: !entry.disabled })}
                            className="border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-white"
                          >
                            {entry.disabled ? "Enable" : "Disable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUserAccount(entry)}
                            className="border-2 border-black bg-red-600 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-white"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
                    </section>

                    <section className="border-4 border-black bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Content Moderation</p>
            <h5 className="mt-2 text-3xl font-black">Homepage Featured Content</h5>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Keep this focused on the content your users actually see on the home page.
            </p>
            <form className="mt-5 space-y-4" onSubmit={saveContentModeration}>
              <input
                className="w-full border-2 border-black bg-white px-4 py-3 text-lg font-bold text-black"
                name="homeHeroHeadline"
                value={content.homeHeroHeadline}
                onChange={handleContentChange}
                placeholder="Homepage headline"
              />
              <textarea
                className="min-h-28 w-full border-2 border-black bg-white px-4 py-3 text-base font-semibold text-black"
                name="homeHeroSubtext"
                value={content.homeHeroSubtext}
                onChange={handleContentChange}
                placeholder="Homepage subtext"
              />
              <input
                className="w-full border-2 border-black bg-white px-4 py-3 text-base font-semibold text-black"
                name="featuredPlayers"
                value={featuredPlayersInput}
                onChange={handleContentChange}
                placeholder="Featured players, comma separated"
              />
              <button
                type="submit"
                disabled={isSavingContent}
                className="w-full border-2 border-black bg-black px-4 py-4 text-sm font-black uppercase tracking-[0.2em] text-white"
              >
                {isSavingContent ? "Saving Content..." : "Save Content Controls"}
              </button>
              {contentMessage ? <p className="text-sm font-semibold">{contentMessage}</p> : null}
            </form>
                    </section>

                    <section className="border-4 border-black bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Audit And Security</p>
            <h5 className="mt-2 text-3xl font-black">Audit Trail And Active Sessions</h5>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Review recent admin actions and revoke sessions when you need to cut off access quickly.
            </p>

            <div className="mt-5 space-y-3">
              <h6 className="text-lg font-black">Recent Audit Events</h6>
              {audits.map((entry) => (
                <article key={entry.id} className="border-2 border-black bg-white p-3">
                  <p className="text-sm font-black">{entry.summary}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {new Date(entry.createdAt).toLocaleString()} | {entry.actionType}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <h6 className="text-lg font-black">Active Sessions</h6>
              {sessions.map((entry) => (
                <article key={entry.id} className="border-2 border-black bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">{entry.username} ({entry.role})</p>
                      <p className="text-xs font-semibold text-slate-500">
                        Last seen {new Date(entry.lastSeenAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => revokeSession(entry.id)}
                      className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.2em]"
                    >
                      Revoke
                    </button>
                  </div>
                </article>
              ))}
            </div>
                    </section>
                  </div>

                  {dashboardMessage ? (
                    <div className="mt-6 border-2 border-black bg-yellow-100 p-4 text-sm font-bold text-black">
                      {dashboardMessage}
                    </div>
                  ) : null}
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
