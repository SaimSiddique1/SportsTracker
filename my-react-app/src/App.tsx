import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import MatchCarousel from "./components/MatchCarousel";
import LeagueTable from "./components/LeagueTable";
import PlayerCard from "./components/PlayerCard";
import RealTimeStats from "./components/RealTimeStats";
import LoginRegister from "./components/LoginRegister";
import SearchBar from "./components/SearchBar";
import type { SearchMode } from "./components/SearchBar";
//import HomePage from "./assets/pages/HomePage";
import SearchResultsPage from "./assets/pages/SearchResultsPage";
import "./App.css";

function AppLayout() {
  const navigate = useNavigate();
  const handleSearch = (query: string, mode: SearchMode) => {
    navigate(`/search?q=${encodeURIComponent(query)}&mode=${mode}`);
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
          {/*<button className="h-10 w-10 border-2 border-black bg-white p-2 font-black transition-all dark:border-white dark:bg-black">
            Mode
          </button>*/}
          <LoginRegister />
        </div>
      </nav>

      {/*<div className="mx-auto flex max-w-7xl px-8 pt-4">
        <button
          onClick={() => navigate("/")}
          className="border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] transition-all hover:bg-yellow-400"
        >
          Back To Home
        </button>
      </div>*/}

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
                        Welcome to Sports <span className="text-yellow-400">Tracker</span>!
                      </h2>
                      <p className="mb-8 max-w-sm text-[10px] font-bold tracking-widest text-slate-400">
                        Search players, explore league tables, and see recent match stats in one place.
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

                  {/*<HomePage />*/}

                  <div>
                    <h3 className="mb-6 text-2xl font-black tracking-tighter">Trending Players</h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <PlayerCard name="Lionel Messi" team="Inter Miami" goals={18} assists={11} />
                      <PlayerCard name="Erling Haaland" team="Manchester City" goals={21} assists={4} />
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
            </>
          }
        />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
