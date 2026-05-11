import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import MatchCarousel from "./components/MatchCarousel";
import LeagueTable from "./components/LeagueTable";
import PlayerCard from "./components/PlayerCard";
import RealTimeStats from "./components/RealTimeStats";
import LoginRegister from "./components/LoginRegister";
import SearchBar from "./components/SearchBar";
import AdminConfigPanel from "./components/AdminConfigPanel";
import { ThemeProvider } from "./components/ThemeContext";
import { ThemeToggle } from "./components/ThemeToggle";
import type { SearchMode } from "./components/SearchBar";
import HomePage from "./assets/pages/HomePage";
import SearchResultsPage from "./assets/pages/SearchResultsPage";
import { getPlayerStats, searchPlayer } from "./sportsdbaAPI";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const buildFallbackImage = (name: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" fill="#facc15"/>
      <rect x="10" y="10" width="236" height="236" fill="none" stroke="#000000" stroke-width="8"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#000000">
        ${name}
      </text>
    </svg>
  `)}`;

const featuredPlayerCatalog: Record<string, { name: string; team: string; goals: number; assists: number; imageUrl: string }> = {
  "lionel messi": { name: "Lionel Messi", team: "Inter Miami", goals: 18, assists: 11, imageUrl: buildFallbackImage("Lionel Messi") },
  "erling haaland": { name: "Erling Haaland", team: "Manchester City", goals: 21, assists: 4, imageUrl: buildFallbackImage("Erling Haaland") },
  "kylian mbappe": { name: "Kylian Mbappe", team: "Real Madrid", goals: 27, assists: 6, imageUrl: buildFallbackImage("Kylian Mbappe") },
  "jude bellingham": { name: "Jude Bellingham", team: "Real Madrid", goals: 15, assists: 10, imageUrl: buildFallbackImage("Jude Bellingham") },
  "mohamed salah": { name: "Mohamed Salah", team: "Liverpool", goals: 22, assists: 12, imageUrl: buildFallbackImage("Mohamed Salah") },
  "harry kane": { name: "Harry Kane", team: "Bayern Munich", goals: 24, assists: 7, imageUrl: buildFallbackImage("Harry Kane") },
  "vinicius junior": { name: "Vinicius Junior", team: "Real Madrid", goals: 17, assists: 9, imageUrl: buildFallbackImage("Vinicius Junior") },
  "bukayo saka": { name: "Bukayo Saka", team: "Arsenal", goals: 16, assists: 11, imageUrl: buildFallbackImage("Bukayo Saka") },
};

type FavoritePlayerRecord = {
  externalId: string;
  playerName: string;
  teamName?: string | null;
  sport?: string | null;
  position?: string | null;
  imageUrl?: string | null;
};

type PlayerProfile = {
  idPlayer?: string;
  strPlayer?: string;
  strTeam?: string;
  strThumb?: string;
  strPosition?: string;
  strNationality?: string;
  strAge?: string;
  strHeight?: string;
  strWeight?: string;
  intGoals?: string;
  intAssists?: string;
};

const displayValue = (value?: string | null) => (value && value.trim() ? value : "Not listed");

function AppLayout() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [homeHeroHeadline, setHomeHeroHeadline] = useState("Welcome to Sports Tracker!");
  const [homeHeroSubtext, setHomeHeroSubtext] = useState("Search players, explore league tables, and see recent match stats in one place.");
  const [featuredPlayers, setFeaturedPlayers] = useState([
    { name: "Lionel Messi", team: "Inter Miami", goals: 18, assists: 11, imageUrl: buildFallbackImage("Lionel Messi") },
    { name: "Erling Haaland", team: "Manchester City", goals: 21, assists: 4, imageUrl: buildFallbackImage("Erling Haaland") },
  ]);
  const [favoritePlayers, setFavoritePlayers] = useState<Array<{ name: string; team: string; position: string; sport: string; imageUrl: string; externalId: string }>>([]);
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(true);
  const [selectedPlayerName, setSelectedPlayerName] = useState("");
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<PlayerProfile | null>(null);
  const [playerProfileLoading, setPlayerProfileLoading] = useState(false);

  useEffect(() => {
    const syncUserRole = () => {
      const rawUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      if (!rawUser || !token) {
        setIsAdmin(false);
        setIsLoggedIn(false);
        return;
      }
      try {
        const parsedUser = JSON.parse(rawUser);
        setIsAdmin(parsedUser?.role === "admin");
        setIsLoggedIn(true);
      } catch {
        setIsAdmin(false);
        setIsLoggedIn(false);
      }
    };
    syncUserRole();
    window.addEventListener("auth-changed", syncUserRole);
    window.addEventListener("storage", syncUserRole);
    return () => {
      window.removeEventListener("auth-changed", syncUserRole);
      window.removeEventListener("storage", syncUserRole);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadFavoritePlayers = async () => {
      const token = localStorage.getItem("token");
      if (!token) { setFavoritePlayers([]); return; }
      try {
        const response = await fetch(`${API_BASE_URL}/api/favorites/players`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || cancelled) { setFavoritePlayers([]); return; }
        const favorites = Array.isArray(data.favorites)
          ? (data.favorites as FavoritePlayerRecord[]).slice(0, 4) : [];
        const enrichedFavorites = await Promise.all(
          favorites.map(async (favorite) => ({
            externalId: favorite.externalId,
            name: favorite.playerName || "Favorite Player",
            team: favorite.teamName || "Saved Favorite",
            position: favorite.position || "Player role",
            sport: favorite.sport || "Football",
            imageUrl: favorite.imageUrl || buildFallbackImage(favorite.playerName || "Player"),
          }))
        );
        if (!cancelled) setFavoritePlayers(enrichedFavorites);
      } catch (error) {
        console.error("Favorite players load error:", error);
        if (!cancelled) setFavoritePlayers([]);
      }
    };
    loadFavoritePlayers();
    window.addEventListener("auth-changed", loadFavoritePlayers);
    return () => { cancelled = true; window.removeEventListener("auth-changed", loadFavoritePlayers); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPublicConfig = async () => {
      try {
        const [configResponse, contentResponse] = await Promise.all([
          fetch("http://localhost:5001/api/system-config/public"),
          fetch("http://localhost:5001/api/admin/content/public"),
        ]);
        const configData = await configResponse.json();
        const contentData = await contentResponse.json();
        if (!configResponse.ok || !contentResponse.ok || cancelled) return;
        setMaintenanceMode(Boolean(configData.config?.maintenanceMode));
        setMaintenanceMessage(String(configData.config?.maintenanceMessage || ""));
        setHomeHeroHeadline(String(contentData.contentModeration?.homeHeroHeadline || "Welcome to Sports Tracker!"));
        setHomeHeroSubtext(String(contentData.contentModeration?.homeHeroSubtext || "Search players, explore league tables, and see recent match stats in one place."));
        const nextFeaturedPlayers = Array.isArray(contentData.contentModeration?.featuredPlayers)
          ? contentData.contentModeration.featuredPlayers
            .map((playerName: string) => featuredPlayerCatalog[playerName.trim().toLowerCase()] || {
              name: playerName, team: "Featured Player", goals: 0, assists: 0, imageUrl: buildFallbackImage(playerName),
            })
            .slice(0, 2) : [];
        if (nextFeaturedPlayers.length > 0) {
          const enrichedPlayers = await Promise.all(
            nextFeaturedPlayers.map(async (player: { name: string; team: string; goals: number; assists: number; imageUrl: string }) => {
              try {
                const results = await searchPlayer(player.name);
                const match = Array.isArray(results)
                  ? results.find((r) => r?.strPlayer?.toLowerCase() === player.name.toLowerCase()) ?? results[0] : null;
                return { ...player, team: match?.strTeam || player.team, imageUrl: match?.strThumb || player.imageUrl };
              } catch { return player; }
            })
          );
          setFeaturedPlayers(enrichedPlayers);
        }
      } catch (error) {
        console.error("Public config load error:", error);
      } finally {
        if (!cancelled) setIsMaintenanceLoading(false);
      }
    };
    loadPublicConfig();
    window.addEventListener("auth-changed", loadPublicConfig);
    return () => { cancelled = true; window.removeEventListener("auth-changed", loadPublicConfig); };
  }, []);

  const handleSearch = (query: string, mode: SearchMode) => {
    navigate(`/search?q=${encodeURIComponent(query)}&mode=${mode}`);
  };

  const openPlayerPopup = async (playerName: string) => {
    setSelectedPlayerName(playerName);
    setSelectedPlayerProfile(null);
    setPlayerProfileLoading(true);
    try {
      const results = await searchPlayer(playerName);
      const match = Array.isArray(results)
        ? results.find((player) => player?.strPlayer?.toLowerCase() === playerName.toLowerCase()) ?? results[0] : null;
      if (match?.idPlayer) {
        const stats = await getPlayerStats(match.idPlayer);
        setSelectedPlayerProfile((Array.isArray(stats) ? stats[0] : null) || match);
        return;
      }
      setSelectedPlayerProfile(match || { strPlayer: playerName });
    } finally {
      setPlayerProfileLoading(false);
    }
  };

  const closePlayerPopup = () => {
    setSelectedPlayerName("");
    setSelectedPlayerProfile(null);
  };

  const showMaintenanceScreen = maintenanceMode && !isAdmin;
  const isDefaultWelcomeHeadline =
    homeHeroHeadline.trim().toLowerCase() === "welcome to sports tracker!" ||
    homeHeroHeadline.trim().toLowerCase() === "welcome to sports tracker";

  const renderHeroHeadline = () => {
    if (!isDefaultWelcomeHeadline) return homeHeroHeadline;
    const trimmedHeadline = homeHeroHeadline.trim();
    const hasExclamation = trimmedHeadline.endsWith("!");
    return (
      <>
        Welcome to Sports <span className="text-yellow-400">Tracker{hasExclamation ? "!" : ""}</span>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 selection:bg-yellow-400 dark:bg-black dark:text-zinc-100">
      {/* Skip navigation link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="
          sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[99999]
          focus:bg-yellow-400 focus:px-4 focus:py-2 focus:text-xs focus:font-black
          focus:uppercase focus:tracking-widest focus:text-black focus:outline-none
        "
      >
        Skip to main content
      </a>

      <nav
        aria-label="Primary navigation"
        className="sticky top-0 z-50 flex items-center justify-between gap-6 border-b-4 border-black bg-white/90 px-8 py-4 backdrop-blur-md dark:border-zinc-800 dark:bg-black/90"
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2"
          aria-label="Sports Tracker — go to home page"
        >
          <div
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center border-2 border-black bg-yellow-400 text-2xl font-black text-black"
          >
            ST
          </div>
          <span className="text-3xl font-black tracking-tighter">
            Sports <span className="text-yellow-500">Tracker</span>
          </span>
        </button>

        <div className="hidden max-w-lg flex-1 lg:block">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search leagues or players"
            showFilters={false}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Theme toggle — sits just left of auth buttons */}
          <ThemeToggle />
          <LoginRegister />
        </div>
      </nav>

      {showMaintenanceScreen ? (
        <main id="main-content" className="mx-auto flex max-w-5xl items-center px-8 py-6">
          <section
            aria-labelledby="maintenance-heading"
            className="w-full overflow-hidden border-4 border-black bg-white shadow-[14px_14px_0_0_rgba(0,0,0,1)]"
          >
            <div className="border-b-4 border-black bg-yellow-400 px-8 py-6 text-black">
              <p className="text-[11px] font-black uppercase tracking-[0.35em]">SportsTracker Maintenance</p>
              <h2 id="maintenance-heading" className="mt-3 text-5xl font-black tracking-tight">
                Currently Under Maintenance
              </h2>
            </div>
            <div className="grid gap-5 px-8 py-5 pb-6 lg:grid-cols-[1fr_0.85fr] lg:items-start">
              <div className="space-y-3">
                <p className="max-w-2xl text-2xl font-black leading-tight text-black">
                  {maintenanceMessage || "Scheduled maintenance is in progress. Please check back soon."}
                </p>
                <div className="flex justify-center py-1 lg:justify-center">
                  <div aria-hidden="true" className="relative h-[7.6rem] w-[7.6rem]">
                    <div className="absolute inset-0 rotate-45 rounded-[1.5rem] border-4 border-black bg-yellow-400 shadow-[6px_6px_0_0_rgba(0,0,0,1)]" />
                    <div className="absolute inset-[11px] rotate-45 rounded-[0.85rem] border-[3px] border-black" />
                    <div className="absolute inset-0 flex -translate-y-1 flex-col items-center justify-center text-center text-black">
                      <div className="mb-1 text-[1.7rem] font-black leading-none">🛠</div>
                      <div className="text-[1.7rem] font-black leading-none tracking-tight">UNDER</div>
                      <div className="mt-1 px-2 text-[0.72rem] font-black uppercase tracking-[0.01em] leading-none">Maintenance</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-2 border-black bg-black p-5 text-white lg:max-w-md lg:justify-self-end">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400">Status</p>
                <p className="mt-3 text-3xl font-black">Service Paused</p>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-200">
                  Browse, search, and live sports views will return after maintenance mode is turned off by an admin.
                </p>
                {isMaintenanceLoading ? (
                  <p aria-live="polite" className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-yellow-400">
                    Checking live status...
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </main>
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              <>
                <MatchCarousel />
                <main
                  id="main-content"
                  className="mx-auto grid max-w-7xl grid-cols-1 gap-12 p-8 lg:grid-cols-12"
                >
                  <section aria-label="Home hero and featured players" className="space-y-12 lg:col-span-8">
                    {/* Hero */}
                    <div className="relative overflow-hidden border border-slate-800 bg-zinc-900 p-12 text-white">
                      <div className="relative z-10">
                        <h1 className="mb-4 text-5xl font-black leading-tight tracking-tighter">
                          {renderHeroHeadline()}
                        </h1>
                        <p className="mb-8 max-w-sm text-[10px] font-bold tracking-widest text-slate-400">
                          {homeHeroSubtext}
                        </p>
                        <div className="flex gap-4">
                          <button
                            onClick={() => navigate("/search?q=Lionel%20Messi&mode=players")}
                            className="bg-yellow-400 px-6 py-3 text-xs font-black tracking-widest text-black transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                          >
                            Search Players
                          </button>
                          <button
                            onClick={() => navigate("/search?q=English%20Premier%20League&mode=teams")}
                            className="border border-white/20 bg-white/10 px-8 py-3 text-xs font-black tracking-widest transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                          >
                            Search Teams
                          </button>
                        </div>
                      </div>
                    </div>

                    <HomePage />

                    {/* Trending Players */}
                    <section aria-labelledby="trending-heading">
                      <h2 id="trending-heading" className="mb-6 text-2xl font-black tracking-tighter">
                        Trending Players
                      </h2>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {featuredPlayers.map((player) => (
                          <PlayerCard
                            key={player.name}
                            name={player.name}
                            team={player.team}
                            goals={player.goals}
                            assists={player.assists}
                            imageUrl={player.imageUrl}
                            onViewDetails={() => openPlayerPopup(player.name)}
                            onCompare={() =>
                              navigate(
                                `/search?q=${encodeURIComponent(player.name)}&mode=players&compare=${encodeURIComponent(player.name)}`
                              )
                            }
                          />
                        ))}
                      </div>
                    </section>

                    {/* Favorite Players */}
                    {isLoggedIn ? (
                      <section aria-labelledby="favorites-heading">
                        <div className="mb-6 flex items-end justify-between gap-4">
                          <div>
                            <h2 id="favorites-heading" className="text-2xl font-black tracking-tighter">
                              Favorite Players
                            </h2>
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                              Saved from your backend favorites
                            </p>
                          </div>
                          <button
                            onClick={() => navigate("/search?mode=players")}
                            className="border-2 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 dark:bg-zinc-900 dark:text-zinc-100"
                          >
                            Find More
                          </button>
                        </div>
                        {favoritePlayers.length ? (
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {favoritePlayers.map((player) => (
                              <article
                                key={player.externalId}
                                onClick={() => openPlayerPopup(player.name)}
                                className="cursor-pointer border-2 border-black bg-white transition-all dark:border-zinc-800 dark:bg-zinc-900"
                                role="button"
                                tabIndex={0}
                                aria-label={`View profile for ${player.name}, ${player.team}`}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    openPlayerPopup(player.name);
                                  }
                                }}
                              >
                                <div className="grid grid-cols-[8rem_1fr] gap-4 p-6">
                                  <img
                                    src={player.imageUrl}
                                    alt={player.name}
                                    className="h-32 w-32 border-2 border-black object-cover"
                                  />
                                  <div>
                                    <div className="mb-4 flex items-start justify-between">
                                      <div>
                                        <h3 className="text-2xl font-black leading-none tracking-tighter">{player.name}</h3>
                                        <p className="mt-1 text-[10px] font-black text-yellow-600">{player.team}</p>
                                      </div>
                                      <div aria-hidden="true" className="flex h-8 w-8 items-center justify-center bg-slate-100 text-xs font-black dark:bg-zinc-800">F</div>
                                    </div>
                                    <dl className="space-y-2">
                                      <div className="flex justify-between border-b-2 border-slate-50 pb-1 dark:border-zinc-800">
                                        <dt className="text-[10px] font-black opacity-40">Position</dt>
                                        <dd className="font-black">{player.position}</dd>
                                      </div>
                                      <div className="flex justify-between border-b-2 border-slate-50 pb-1 dark:border-zinc-800">
                                        <dt className="text-[10px] font-black opacity-40">Sport</dt>
                                        <dd className="font-black">{player.sport}</dd>
                                      </div>
                                    </dl>
                                  </div>
                                </div>
                                <button
                                  className="w-full border-t-2 border-black bg-yellow-400 py-3 text-[10px] font-black tracking-widest text-black transition-all hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    navigate(
                                      `/search?q=${encodeURIComponent(player.name)}&mode=players&compare=${encodeURIComponent(player.name)}`
                                    );
                                  }}
                                  type="button"
                                >
                                  Compare Player
                                </button>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-slate-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
                            <p className="text-lg font-black">No favorite players saved yet.</p>
                            <p className="mt-2 text-sm font-semibold text-slate-500">
                              Save players from search results and they will show up here on the home page.
                            </p>
                          </div>
                        )}
                      </section>
                    ) : null}
                  </section>

                  <aside aria-label="League table and recent stats" className="lg:col-span-4">
                    <div className="border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                      <h2 className="mb-6 inline-block border-b-4 border-yellow-400 text-xl font-black tracking-tighter">
                        League Table
                      </h2>
                      <LeagueTable />
                      <div className="mt-8">
                        <RealTimeStats />
                      </div>
                    </div>
                  </aside>
                </main>

                <div className="mx-auto max-w-7xl px-8 pb-12">
                  <AdminConfigPanel />
                </div>

                {/* Player detail modal */}
                {selectedPlayerName ? (
                  <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="player-modal-name"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) closePlayerPopup();
                    }}
                    onKeyDown={(e) => { if (e.key === "Escape") closePlayerPopup(); }}
                  >
                    <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-4 border-black bg-white p-6 shadow-[10px_10px_0_0_rgba(250,204,21,1)] dark:bg-zinc-900">
                      <div className="mb-5 flex justify-end">
                        <button
                          type="button"
                          onClick={closePlayerPopup}
                          aria-label="Close player profile"
                          className="border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                        >
                          Close
                        </button>
                      </div>
                      {playerProfileLoading ? (
                        <p aria-live="polite" className="font-semibold">Loading player stats...</p>
                      ) : (
                        <div>
                          <div className="grid gap-5 md:grid-cols-[11rem_1fr]">
                            <img
                              src={selectedPlayerProfile?.strThumb || buildFallbackImage(selectedPlayerName)}
                              alt={selectedPlayerProfile?.strPlayer || selectedPlayerName}
                              className="h-44 w-44 border-2 border-black object-cover"
                            />
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-600">Player Profile</p>
                              <h2 id="player-modal-name" className="mt-2 text-3xl font-black tracking-tight">
                                {selectedPlayerProfile?.strPlayer || selectedPlayerName}
                              </h2>
                              <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-400">
                                {displayValue(selectedPlayerProfile?.strTeam)}
                              </p>
                              {selectedPlayerProfile?.strTeam ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(`/search?q=${encodeURIComponent(selectedPlayerProfile.strTeam || "")}&mode=teams`)
                                  }
                                  className="mt-4 border-2 border-black bg-yellow-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                                >
                                  View Team Players
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                            {[
                              ["Position", selectedPlayerProfile?.strPosition],
                              ["Nationality", selectedPlayerProfile?.strNationality],
                              ["Age", selectedPlayerProfile?.strAge],
                              ["Height", selectedPlayerProfile?.strHeight],
                              ["Weight", selectedPlayerProfile?.strWeight],
                              ["Goals", selectedPlayerProfile?.intGoals],
                              ["Assists", selectedPlayerProfile?.intAssists],
                            ].map(([label, value]) => (
                              <div key={label} className="border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                                <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</dt>
                                <dd className="mt-1 font-black">{displayValue(value)}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}
                    </section>
                  </div>
                ) : null}
              </>
            }
          />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppLayout />
      </Router>
    </ThemeProvider>
  );
}

export default App;