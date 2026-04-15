import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import MatchCarousel from "./components/MatchCarousel";
import LeagueTable from "./components/LeagueTable";
import PlayerCard from "./components/PlayerCard";
import RealTimeStats from "./components/RealTimeStats";
import LoginRegister from "./components/LoginRegister";
import SearchBar from "./components/SearchBar";
import AdminConfigPanel from "./components/AdminConfigPanel";
import type { SearchMode } from "./components/SearchBar";
import HomePage from "./assets/pages/HomePage";
import SearchResultsPage from "./assets/pages/SearchResultsPage";
import "./App.css";

const featuredPlayerCatalog: Record<string, { name: string; team: string; goals: number; assists: number }> = {
  "lionel messi": { name: "Lionel Messi", team: "Inter Miami", goals: 18, assists: 11 },
  "erling haaland": { name: "Erling Haaland", team: "Manchester City", goals: 21, assists: 4 },
  "kylian mbappe": { name: "Kylian Mbappe", team: "Real Madrid", goals: 27, assists: 6 },
  "jude bellingham": { name: "Jude Bellingham", team: "Real Madrid", goals: 15, assists: 10 },
  "mohamed salah": { name: "Mohamed Salah", team: "Liverpool", goals: 22, assists: 12 },
  "harry kane": { name: "Harry Kane", team: "Bayern Munich", goals: 24, assists: 7 },
  "vinicius junior": { name: "Vinicius Junior", team: "Real Madrid", goals: 17, assists: 9 },
  "bukayo saka": { name: "Bukayo Saka", team: "Arsenal", goals: 16, assists: 11 },
};

function AppLayout() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [homeHeroHeadline, setHomeHeroHeadline] = useState("Welcome to Sports Tracker!");
  const [homeHeroSubtext, setHomeHeroSubtext] = useState("Search players, explore league tables, and see recent match stats in one place.");
  const [featuredPlayers, setFeaturedPlayers] = useState([
    { name: "Lionel Messi", team: "Inter Miami", goals: 18, assists: 11 },
    { name: "Erling Haaland", team: "Manchester City", goals: 21, assists: 4 },
  ]);
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(true);

  useEffect(() => {
    const syncUserRole = () => {
      const rawUser = localStorage.getItem("user");

      if (!rawUser) {
        setIsAdmin(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(rawUser);
        setIsAdmin(parsedUser?.role === "admin");
      } catch {
        setIsAdmin(false);
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

    const loadPublicConfig = async () => {
      try {
        const [configResponse, contentResponse] = await Promise.all([
          fetch("http://localhost:5001/api/system-config/public"),
          fetch("http://localhost:5001/api/admin/content/public"),
        ]);
        const configData = await configResponse.json();
        const contentData = await contentResponse.json();

        if (!configResponse.ok || !contentResponse.ok || cancelled) {
          return;
        }

        setMaintenanceMode(Boolean(configData.config?.maintenanceMode));
        setMaintenanceMessage(String(configData.config?.maintenanceMessage || ""));
        setHomeHeroHeadline(String(contentData.contentModeration?.homeHeroHeadline || "Welcome to Sports Tracker!"));
        setHomeHeroSubtext(String(contentData.contentModeration?.homeHeroSubtext || "Search players, explore league tables, and see recent match stats in one place."));
        const nextFeaturedPlayers = Array.isArray(contentData.contentModeration?.featuredPlayers)
          ? contentData.contentModeration.featuredPlayers
            .map((playerName: string) => featuredPlayerCatalog[playerName.trim().toLowerCase()] || {
              name: playerName,
              team: "Featured Player",
              goals: 0,
              assists: 0,
            })
            .slice(0, 2)
          : [];
        if (nextFeaturedPlayers.length > 0) {
          setFeaturedPlayers(nextFeaturedPlayers);
        }
      } catch (error) {
        console.error("Public config load error:", error);
      } finally {
        if (!cancelled) {
          setIsMaintenanceLoading(false);
        }
      }
    };

    loadPublicConfig();
    window.addEventListener("auth-changed", loadPublicConfig);

    return () => {
      cancelled = true;
      window.removeEventListener("auth-changed", loadPublicConfig);
    };
  }, []);

  const handleSearch = (query: string, mode: SearchMode) => {
    navigate(`/search?q=${encodeURIComponent(query)}&mode=${mode}`);
  };

  const showMaintenanceScreen = maintenanceMode && !isAdmin;
  const isDefaultWelcomeHeadline = homeHeroHeadline.trim().toLowerCase() === "welcome to sports tracker!" ||
    homeHeroHeadline.trim().toLowerCase() === "welcome to sports tracker";

  const renderHeroHeadline = () => {
    if (!isDefaultWelcomeHeadline) {
      return homeHeroHeadline;
    }

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
      <nav className="sticky top-0 z-50 flex items-center justify-between gap-6 border-b-4 border-black bg-white/90 px-8 py-4 backdrop-blur-md dark:border-zinc-800 dark:bg-black/90">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3"
          aria-label="Go to home page"
        >
          <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-yellow-400 text-2xl font-black text-black">
            ST
          </div>
          <h1 className="text-3xl font-black tracking-tighter">
            Sports <span className="text-yellow-500">Tracker</span>
          </h1>
        </button>

        <div className="hidden max-w-lg flex-1 lg:block">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search leagues or players"
          />
        </div>

        <div className="flex items-center gap-4">
          <button className="h-10 w-10 border-2 border-black bg-white p-2 font-black transition-all dark:border-white dark:bg-black">
            Mode
          </button>
          <LoginRegister />
        </div>
      </nav>

      {!showMaintenanceScreen ? (
        <div className="mx-auto flex max-w-7xl px-8 pt-4">
          <button
            onClick={() => navigate("/")}
            className="border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-yellow-400"
          >
            Back To Home
          </button>
        </div>
      ) : null}

      {showMaintenanceScreen ? (
        <main className="mx-auto flex max-w-5xl items-center px-8 py-6">
          <section className="w-full overflow-hidden border-4 border-black bg-white shadow-[14px_14px_0_0_rgba(0,0,0,1)]">
            <div className="border-b-4 border-black bg-yellow-400 px-8 py-6 text-black">
              <p className="text-[11px] font-black uppercase tracking-[0.35em]">
                SportsTracker Maintenance
              </p>
              <h2 className="mt-3 text-5xl font-black tracking-tight">
                Currently Under Maintenance
              </h2>
            </div>
            <div className="grid gap-5 px-8 py-5 pb-6 lg:grid-cols-[1fr_0.85fr] lg:items-start">
              <div className="space-y-3">
                <p className="max-w-2xl text-2xl font-black leading-tight text-black">
                  {maintenanceMessage || "Scheduled maintenance is in progress. Please check back soon."}
                </p>
                <div className="flex justify-center py-1 lg:justify-center">
                  <div className="relative h-[7.6rem] w-[7.6rem]">
                    <div className="absolute inset-0 rotate-45 rounded-[1.5rem] border-4 border-black bg-yellow-400 shadow-[6px_6px_0_0_rgba(0,0,0,1)]" />
                    <div className="absolute inset-[11px] rotate-45 rounded-[0.85rem] border-[3px] border-black" />
                    <div className="absolute inset-0 flex -translate-y-1 flex-col items-center justify-center text-center text-black">
                      <div className="mb-1 text-[1.7rem] font-black leading-none">🛠</div>
                      <div className="text-[1.7rem] font-black leading-none tracking-tight">
                        UNDER
                      </div>
                      <div className="mt-1 px-2 text-[0.72rem] font-black uppercase tracking-[0.01em] leading-none">
                        Maintenance
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-2 border-black bg-black p-5 text-white lg:max-w-md lg:justify-self-end">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400">
                  Status
                </p>
                <p className="mt-3 text-3xl font-black">Service Paused</p>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-200">
                  Browse, search, and live sports views will return after maintenance mode is turned off by an admin.
                </p>
                {isMaintenanceLoading ? (
                  <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-yellow-400">
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
                <main className="mx-auto grid max-w-7xl grid-cols-1 gap-12 p-8 lg:grid-cols-12">
                  <section className="space-y-12 lg:col-span-8">
                    <div className="relative overflow-hidden border border-slate-800 bg-zinc-900 p-12 text-white">
                      <div className="relative z-10">
                        <h2 className="mb-4 text-5xl font-black leading-tight tracking-tighter">
                          {renderHeroHeadline()}
                        </h2>
                      <p className="mb-8 max-w-sm text-[10px] font-bold tracking-widest text-slate-400">
                          {homeHeroSubtext}
                        </p>
                        <div className="flex gap-4">
                          <button
                            onClick={() => navigate("/search?q=Lionel%20Messi&mode=players")}
                            className="bg-yellow-400 px-6 py-3 text-xs font-black tracking-widest text-black transition-colors hover:bg-white"
                          >
                            Search Players
                          </button>
                          <button
                            onClick={() => navigate("/search?q=English%20Premier%20League&mode=teams")}
                            className="border border-white/20 bg-white/10 px-8 py-3 text-xs font-black tracking-widest transition-colors hover:bg-white/20"
                          >
                            Search Teams
                          </button>
                        </div>
                      </div>
                    </div>

                    <HomePage />

                    <div>
                      <h3 className="mb-6 text-2xl font-black tracking-tighter">Trending Players</h3>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {featuredPlayers.map((player) => (
                          <PlayerCard
                            key={player.name}
                            name={player.name}
                            team={player.team}
                            goals={player.goals}
                            assists={player.assists}
                          />
                        ))}
                      </div>
                    </div>
                  </section>

                  <aside className="lg:col-span-4">
                    <div className="border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                      <h3 className="mb-6 inline-block border-b-4 border-yellow-400 text-xl font-black tracking-tighter">
                        League Table
                      </h3>
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
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
