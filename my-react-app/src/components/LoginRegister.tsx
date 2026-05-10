import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import LoginPage from "../assets/pages/LoginPage.jsx";
import RegisterPage from "../assets/pages/RegisterPage.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
const AUTH_ERROR_MESSAGES = new Set([
  "Invalid or expired token.",
  "Authentication token is required.",
  "User session is no longer valid.",
  "This session has been revoked.",
]);

const clearStoredAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth-changed"));
};

const isAuthFailure = (status: number, message?: string) =>
  status === 401 || status === 403 || AUTH_ERROR_MESSAGES.has(message || "");

const buildFallbackImage = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" fill="#fde047"/>
      <rect x="10" y="10" width="236" height="236" fill="none" stroke="#000000" stroke-width="8"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#000000">
        ${label}
      </text>
    </svg>
  `)}`;

type AuthUser = {
  id?: number;
  username?: string;
  email?: string;
  role?: string;
  bio?: string;
};

type FavoritePlayerRecord = {
  id: number;
  externalId: string;
  playerName: string;
  teamName?: string | null;
  sport?: string | null;
  position?: string | null;
  imageUrl?: string | null;
  rawPayload?: Record<string, unknown>;
};

type FavoriteTeamRecord = {
  id: number;
  externalId: string;
  teamName: string;
  leagueName?: string | null;
  country?: string | null;
  badgeUrl?: string | null;
  rawPayload?: Record<string, unknown>;
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
    currentPassword: "",
    newPassword: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [favoritePlayers, setFavoritePlayers] = useState<FavoritePlayerRecord[]>([]);
  const [favoriteTeams, setFavoriteTeams] = useState<FavoriteTeamRecord[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoriteActionKey, setFavoriteActionKey] = useState("");

  const currentUserLabel = useMemo(
    () => user?.username || user?.email || "User",
    [user]
  );

  useEffect(() => {
    const syncUser = () => {
      const rawUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!rawUser || !token) {
        localStorage.removeItem("user");
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
      currentPassword: "",
      newPassword: "",
    });
    setProfileMessage("");
  }, [profileOpen, user]);

  useEffect(() => {
    if (!profileOpen || !user) {
      return;
    }

    const loadFavorites = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setFavoritePlayers([]);
        setFavoriteTeams([]);
        return;
      }

      setFavoritesLoading(true);

      try {
        const [playerResponse, teamResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/favorites/players`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/api/favorites/teams`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const playerData = await playerResponse.json();
        const teamData = await teamResponse.json();

        if (!playerResponse.ok || !teamResponse.ok) {
          if (
            isAuthFailure(
              !playerResponse.ok ? playerResponse.status : teamResponse.status,
              playerData.message || teamData.message
            )
          ) {
            clearStoredAuth();
            setFavoritePlayers([]);
            setFavoriteTeams([]);
            setProfileMessage("Your session expired. Log in again to manage favorites.");
            return;
          }

          setProfileMessage(playerData.message || teamData.message || "Could not load saved favorites.");
          return;
        }

        setFavoritePlayers(Array.isArray(playerData.favorites) ? playerData.favorites : []);
        setFavoriteTeams(Array.isArray(teamData.favorites) ? teamData.favorites : []);
      } catch (error) {
        console.error("Favorites load error:", error);
        setProfileMessage("Could not connect to backend favorites.");
      } finally {
        setFavoritesLoading(false);
      }
    };

    loadFavorites();
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
    clearStoredAuth();
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
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
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

      if (!response.ok) {
        setProfileMessage(data.message || "Could not update profile.");
        return;
      }

      const nextUser = {
        ...user,
        ...data.user,
        bio: profileForm.bio,
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

  const removeFavoritePlayer = async (favorite: FavoritePlayerRecord) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setProfileMessage("You must be logged in to manage favorites.");
      return;
    }

    setFavoriteActionKey(`player-${favorite.externalId}`);
    setProfileMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/favorites/players/${encodeURIComponent(favorite.externalId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        if (isAuthFailure(response.status, data.message)) {
          clearStoredAuth();
          setFavoritePlayers([]);
          setFavoriteTeams([]);
          setProfileMessage("Your session expired. Log in again to manage favorites.");
          return;
        }

        setProfileMessage(data.message || "Could not remove favorite player.");
        return;
      }

      setFavoritePlayers((current) =>
        current.filter((entry) => entry.externalId !== favorite.externalId)
      );
      setProfileMessage(data.message || "Favorite player removed.");
      window.dispatchEvent(new Event("auth-changed"));
    } catch (error) {
      console.error("Favorite player removal error:", error);
      setProfileMessage("Could not connect to backend favorites.");
    } finally {
      setFavoriteActionKey("");
    }
  };

  const removeFavoriteTeam = async (favorite: FavoriteTeamRecord) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setProfileMessage("You must be logged in to manage favorites.");
      return;
    }

    setFavoriteActionKey(`team-${favorite.externalId}`);
    setProfileMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/favorites/teams/${encodeURIComponent(favorite.externalId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        if (isAuthFailure(response.status, data.message)) {
          clearStoredAuth();
          setFavoritePlayers([]);
          setFavoriteTeams([]);
          setProfileMessage("Your session expired. Log in again to manage favorites.");
          return;
        }

        setProfileMessage(data.message || "Could not remove favorite team.");
        return;
      }

      setFavoriteTeams((current) =>
        current.filter((entry) => entry.externalId !== favorite.externalId)
      );
      setProfileMessage(data.message || "Favorite team removed.");
      window.dispatchEvent(new Event("auth-changed"));
    } catch (error) {
      console.error("Favorite team removal error:", error);
      setProfileMessage("Could not connect to backend favorites.");
    } finally {
      setFavoriteActionKey("");
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
                      Update your name and password, then review your saved favorites from the live backend.
                    </p>
                    <p className="mt-2 inline-block border-2 border-black bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-black">
                      Role: {user.role || "user"}
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
                      Your bio is still session-only for now. Favorites are saved to your account and stay available when you come back.
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-6">
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

                    <section className="space-y-5 border-4 border-black bg-slate-50 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Saved Favorites
                          </p>
                          <h3 className="mt-2 text-2xl font-black tracking-tight">
                            Your Saved Favorites
                          </h3>
                          <p className="mt-2 text-sm font-semibold text-slate-600">
                            Save players and teams from search, then come back here to view or remove them anytime.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            window.location.href = "/search";
                          }}
                          className="border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em]"
                        >
                          Open Search
                        </button>
                      </div>

                      {favoritesLoading ? (
                        <p className="text-sm font-semibold">Loading saved favorites...</p>
                      ) : (
                        <div className="grid gap-6 lg:grid-cols-2">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-black">Favorite Players</h4>
                              <span className="border-2 border-black bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                                {favoritePlayers.length}
                              </span>
                            </div>
                            {favoritePlayers.length ? (
                              favoritePlayers.map((favorite) => (
                                <article key={favorite.externalId} className="flex gap-3 border-2 border-black bg-white p-3">
                                  <img
                                    src={favorite.imageUrl || buildFallbackImage(favorite.playerName || "PLAYER")}
                                    alt={favorite.playerName}
                                    className="h-20 w-20 border-2 border-black object-cover"
                                  />
                                  <div className="flex flex-1 flex-col justify-between gap-2">
                                    <div>
                                      <p className="font-black">{favorite.playerName}</p>
                                      <p className="text-sm font-semibold text-slate-600">
                                        {favorite.teamName || "Club not listed"}
                                      </p>
                                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                        {favorite.position || favorite.sport || "Player"}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeFavoritePlayer(favorite)}
                                      disabled={favoriteActionKey === `player-${favorite.externalId}`}
                                      className="w-fit border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {favoriteActionKey === `player-${favorite.externalId}` ? "Removing..." : "Remove Favorite"}
                                    </button>
                                  </div>
                                </article>
                              ))
                            ) : (
                              <p className="border-2 border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-500">
                                No favorite players saved yet.
                              </p>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-black">Favorite Teams</h4>
                              <span className="border-2 border-black bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                                {favoriteTeams.length}
                              </span>
                            </div>
                            {favoriteTeams.length ? (
                              favoriteTeams.map((favorite) => (
                                <article key={favorite.externalId} className="flex gap-3 border-2 border-black bg-white p-3">
                                  <img
                                    src={favorite.badgeUrl || buildFallbackImage(favorite.teamName || "TEAM")}
                                    alt={favorite.teamName}
                                    className="h-20 w-20 border-2 border-black object-contain bg-white p-2"
                                  />
                                  <div className="flex flex-1 flex-col justify-between gap-2">
                                    <div>
                                      <p className="font-black">{favorite.teamName}</p>
                                      <p className="text-sm font-semibold text-slate-600">
                                        {favorite.leagueName || "League not listed"}
                                      </p>
                                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                        {favorite.country || "Club"}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeFavoriteTeam(favorite)}
                                      disabled={favoriteActionKey === `team-${favorite.externalId}`}
                                      className="w-fit border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {favoriteActionKey === `team-${favorite.externalId}` ? "Removing..." : "Remove Favorite"}
                                    </button>
                                  </div>
                                </article>
                              ))
                            ) : (
                              <p className="border-2 border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-500">
                                No favorite teams saved yet.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </section>
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
