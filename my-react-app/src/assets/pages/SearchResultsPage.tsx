import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SearchBar from "../../components/SearchBar";
import type { SearchMode } from "../../components/SearchBar";
import {
  getLeagueTable as getSportsDbLeagueTable,
  searchPlayer,
  searchTeam,
} from "../../sportsdbaAPI";

type TeamResult = {
  idTeam?: string;
  strTeam?: string;
  strLeague?: string;
  strTeamBadge?: string;
  strCountry?: string;
};

type PlayerResult = {
  idPlayer?: string;
  strPlayer?: string;
  strTeam?: string;
  strSport?: string;
  strThumb?: string;
  strPosition?: string;
};

type TableRow = {
  intRank?: string | number;
  strTeam?: string;
  intPlayed?: string | number;
  intPoints?: string | number;
};

type Competition = {
  id: string;
  label: string;
  name: string;
  country: string;
  season: string;
  aliases: string[];
};

const competitions: Competition[] = [
  {
    id: "4328",
    label: "PL",
    name: "English Premier League",
    country: "England",
    season: "2024-2025",
    aliases: ["premier league", "english premier league", "epl", "premierleague"],
  },
  {
    id: "4335",
    label: "LL",
    name: "Spanish La Liga",
    country: "Spain",
    season: "2024-2025",
    aliases: ["la liga", "spanish la liga", "laliga"],
  },
  {
    id: "4331",
    label: "BL",
    name: "German Bundesliga",
    country: "Germany",
    season: "2024-2025",
    aliases: ["bundesliga", "german bundesliga"],
  },
  {
    id: "4332",
    label: "SA",
    name: "Italian Serie A",
    country: "Italy",
    season: "2024-2025",
    aliases: ["serie a", "italian serie a", "seriea"],
  },
  {
    id: "4334",
    label: "L1",
    name: "French Ligue 1",
    country: "France",
    season: "2024-2025",
    aliases: ["ligue 1", "french ligue 1", "ligue1"],
  },
];

const normalizeCompetitionQuery = (query: string) => query.trim().toLowerCase();

function SearchResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const query = searchParams.get("q")?.trim() ?? "";
  const mode = (searchParams.get("mode") as SearchMode | null) ?? "players";

  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [competitionTable, setCompetitionTable] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");

  const matchingCompetitions = useMemo(() => {
    if (!query) {
      return [];
    }

    const normalized = normalizeCompetitionQuery(query);
    return competitions.filter((competition) =>
      competition.aliases.some((alias) => alias.includes(normalized)) ||
      competition.name.toLowerCase().includes(normalized) ||
      competition.country.toLowerCase().includes(normalized)
    );
  }, [query]);

  const handleSearch = (nextQuery: string, nextMode: SearchMode) => {
    navigate(`/search?q=${encodeURIComponent(nextQuery)}&mode=${nextMode}`);
  };

  useEffect(() => {
    setPlayers([]);
    setTeams([]);
    setSelectedCompetition(null);
    setCompetitionTable([]);
    setError("");

    if (!query) {
      return;
    }

    const fetchResults = async () => {
      setLoading(true);

      try {
        if (mode === "players") {
          const playerResults = await searchPlayer(query).catch(() => []);
          setPlayers(Array.isArray(playerResults) ? playerResults.slice(0, 8) : []);
        }

        if (mode === "teams") {
          const teamResults = await searchTeam(query).catch(() => []);
          setTeams(Array.isArray(teamResults) ? teamResults : []);
        }

        if (mode === "competitions") {
          if (!matchingCompetitions.length) {
            setError("No competition matches found. Try a full league name or a known alias like 'la liga' or 'epl'.");
          } else if (matchingCompetitions.length === 1) {
            setSelectedCompetition(matchingCompetitions[0]);
          }
        }
      } catch (err) {
        console.error("Search failed:", err);
        setError("Search is unavailable right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [mode, query, matchingCompetitions]);

  useEffect(() => {
    if (!selectedCompetition) {
      setCompetitionTable([]);
      return;
    }

    const fetchTable = async () => {
      setTableLoading(true);

      try {
        const table = await getSportsDbLeagueTable(
          selectedCompetition.id,
          selectedCompetition.season
        );
        setCompetitionTable(Array.isArray(table) ? table.slice(0, 20) : []);
      } catch (err) {
        console.error("League table fetch failed:", err);
        setCompetitionTable([]);
      } finally {
        setTableLoading(false);
      }
    };

    fetchTable();
  }, [selectedCompetition]);

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <section className="border-4 border-black bg-yellow-400 p-8 shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
        <h1 className="mb-2 text-3xl font-black tracking-tight">Global Search</h1>
        <p className="mb-6 text-sm font-semibold text-slate-600">
          Search for players, teams, or competitions using the buttons below.
        </p>

        <SearchBar
          initialValue={query}
          initialMode={mode}
          onSearch={handleSearch}
          placeholder="Try: Lionel Messi, English Premier League, or la liga"
        />

        <div className="mt-8 space-y-8">
          {loading ? <p className="font-semibold">Searching...</p> : null}
          {error ? <p className="font-semibold text-red-600">{error}</p> : null}

          {mode === "players" && !loading ? (
            <div>
              <h2 className="mb-4 text-xl font-black tracking-tight">
                Player Results for "{query}"
              </h2>
              {players.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {players.map((player) => (
                    <article
                      key={player.idPlayer}
                      className="flex gap-4 border border-slate-200 bg-slate-50 p-4"
                    >
                      {player.strThumb ? (
                        <img
                          src={player.strThumb}
                          alt={player.strPlayer ?? "Player"}
                          className="h-24 w-24 object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center bg-yellow-300 text-xs font-black">
                          NO IMG
                        </div>
                      )}
                      <div>
                        <h3 className="font-black">{player.strPlayer}</h3>
                        <p className="text-sm font-semibold">{player.strTeam || "No team listed"}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          {player.strPosition || player.strSport || "Profile"}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="font-semibold text-slate-500">No players found for this search.</p>
              )}
            </div>
          ) : null}

          {mode === "teams" && !loading ? (
            <div>
              <h2 className="mb-4 text-xl font-black tracking-tight">
                Team Results for "{query}"
              </h2>
              {teams.length ? (
                <div className="max-h-[36rem] overflow-y-auto pr-2">
                  <div className="grid gap-4 md:grid-cols-2">
                    {teams.map((team) => (
                      <article
                        key={team.idTeam}
                        className="flex gap-4 border border-slate-200 bg-slate-50 p-4"
                      >
                        {team.strTeamBadge ? (
                          <img
                            src={team.strTeamBadge}
                            alt={team.strTeam ?? "Team"}
                            className="h-20 w-20 object-contain"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center bg-black text-xs font-black text-white">
                            NO BADGE
                          </div>
                        )}
                        <div>
                          <h3 className="font-black">{team.strTeam}</h3>
                          <p className="text-sm font-semibold">{team.strLeague}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            {team.strCountry || "Club"}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="font-semibold text-slate-500">
                  No team results found. Try a club name like Barcelona, Arsenal, or Inter Miami.
                </p>
              )}
            </div>
          ) : null}

          {mode === "competitions" && !loading ? (
            <div className="space-y-6">
              <div>
                <h2 className="mb-4 text-xl font-black tracking-tight">
                  Competition Results for "{query}"
                </h2>
                {matchingCompetitions.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {matchingCompetitions.map((competition) => (
                      <button
                        key={competition.id}
                        onClick={() => setSelectedCompetition(competition)}
                        className={`flex items-center gap-4 border-2 p-4 text-left transition-all ${
                          selectedCompetition?.id === competition.id
                            ? "border-black bg-yellow-100"
                            : "border-slate-200 bg-slate-50 hover:border-black"
                        }`}
                      >
                        <div className="flex h-16 w-16 items-center justify-center border-2 border-black bg-yellow-400 text-lg font-black text-black">
                          {competition.label}
                        </div>
                        <div>
                          <h3 className="font-black">{competition.name}</h3>
                          <p className="text-sm font-semibold">{competition.country}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Click to view league table
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="font-semibold text-slate-500">
                    No competitions found. Try names like la liga, premier league, bundesliga, or serie a.
                  </p>
                )}
              </div>

              {selectedCompetition ? (
                <div className="border border-slate-200 bg-slate-50 p-6">
                  <h3 className="mb-4 text-2xl font-black tracking-tight">
                    {selectedCompetition.name} Table
                  </h3>
                  {tableLoading ? (
                    <p className="font-semibold">Loading league table...</p>
                  ) : competitionTable.length ? (
                    <div className="max-h-[32rem] overflow-y-auto">
                      <div className="grid grid-cols-12 border-b pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        <span className="col-span-1">Pos</span>
                        <span className="col-span-6">Team</span>
                        <span className="col-span-2">Played</span>
                        <span className="col-span-3">Points</span>
                      </div>
                      {competitionTable.map((row) => (
                        <div
                          key={`${row.intRank}-${row.strTeam}`}
                          className="grid grid-cols-12 border-b py-3 text-sm font-semibold"
                        >
                          <span className="col-span-1">{row.intRank}</span>
                          <span className="col-span-6">{row.strTeam}</span>
                          <span className="col-span-2">{row.intPlayed}</span>
                          <span className="col-span-3 font-black">{row.intPoints}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-semibold text-slate-500">No table data found for this competition.</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default SearchResultsPage;
