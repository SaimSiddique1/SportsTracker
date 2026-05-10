import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SearchBar from "../../components/SearchBar";
import type { SearchMode } from "../../components/SearchBar";
import {
  getLeagueTable as getSportsDbLeagueTable,
  getPlayerStats,
  searchPlayer,
  searchTeam,
} from "../../sportsdbaAPI";

// ─── Types ───────────────────────────────────────────────────────────────────

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

type PlayerComparisonProfile = {
  id: string;
  name: string;
  team: string;
  age: string;
  nationality: string;
  position: string;
  height: string;
  weight: string;
  goals: string;
  assists: string;
};

type ComparisonMetric = {
  label: string;
  leftValue: string;
  rightValue: string;
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

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_VALUE = "N/A";

const competitions: Competition[] = [
  { id: "4328", label: "PL", name: "English Premier League", country: "England", season: "2024-2025", aliases: ["premier league", "english premier league", "epl", "premierleague"] },
  { id: "4335", label: "LL", name: "Spanish La Liga",         country: "Spain",   season: "2024-2025", aliases: ["la liga", "spanish la liga", "laliga"] },
  { id: "4331", label: "BL", name: "German Bundesliga",        country: "Germany", season: "2024-2025", aliases: ["bundesliga", "german bundesliga"] },
  { id: "4332", label: "SA", name: "Italian Serie A",          country: "Italy",   season: "2024-2025", aliases: ["serie a", "italian serie a", "seriea"] },
  { id: "4334", label: "L1", name: "French Ligue 1",           country: "France",  season: "2024-2025", aliases: ["ligue 1", "french ligue 1", "ligue1"] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toDisplay = (value?: string | null) =>
  value?.trim() ? value : EMPTY_VALUE;

const buildPlayerProfile = (
  fallback: PlayerResult,
  apiProfile?: Record<string, string | null>
): PlayerComparisonProfile => ({
  id: fallback.idPlayer ?? "",
  name: toDisplay(apiProfile?.strPlayer ?? fallback.strPlayer),
  team: toDisplay(apiProfile?.strTeam ?? fallback.strTeam),
  age: toDisplay(apiProfile?.strAge),
  nationality: toDisplay(apiProfile?.strNationality),
  position: toDisplay(apiProfile?.strPosition),
  height: toDisplay(apiProfile?.strHeight),
  weight: toDisplay(apiProfile?.strWeight),
  goals: toDisplay(apiProfile?.intGoals),
  assists: toDisplay(apiProfile?.intAssists),
});

const normalizeCompetitionQuery = (query: string) => query.trim().toLowerCase();

// ─── Shared class strings ─────────────────────────────────────────────────────

const cardCls =
  "flex gap-4 border border-slate-200 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-800";

const mutedText =
  "text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400";

// ─── PlayerComparisonPanel ────────────────────────────────────────────────────

interface PlayerComparisonPanelProps {
  selectedPlayers: PlayerResult[];
  onRemovePlayer: (id: string) => void;
  onResetComparison: () => void;
}

function PlayerComparisonPanel({
  selectedPlayers,
  onRemovePlayer,
  onResetComparison,
}: PlayerComparisonPanelProps) {
  const [profiles, setProfiles] = useState<PlayerComparisonProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPlayers.length !== 2 || !selectedPlayers.every((p) => p.idPlayer)) {
      setProfiles([]);
      return;
    }
    const fetchPlayerProfiles = async () => {
      setLoading(true);
      try {
        const responses = await Promise.all(
          selectedPlayers.map(async (player) => {
            const players = await getPlayerStats(player.idPlayer!);
            const profile = Array.isArray(players) ? players[0] : undefined;
            return buildPlayerProfile(player, profile as Record<string, string | null> | undefined);
          })
        );
        setProfiles(responses);
      } catch (error) {
        console.error("Unable to load comparison data", error);
        setProfiles(selectedPlayers.map((p) => buildPlayerProfile(p)));
      } finally {
        setLoading(false);
      }
    };
    fetchPlayerProfiles();
  }, [selectedPlayers]);

  const metrics = useMemo<ComparisonMetric[]>(() => {
    if (profiles.length !== 2) return [];
    const [left, right] = profiles;
    return [
      { label: "Team",        leftValue: left.team,        rightValue: right.team },
      { label: "Age",         leftValue: left.age,         rightValue: right.age },
      { label: "Position",    leftValue: left.position,    rightValue: right.position },
      { label: "Nationality", leftValue: left.nationality, rightValue: right.nationality },
      { label: "Height",      leftValue: left.height,      rightValue: right.height },
      { label: "Weight",      leftValue: left.weight,      rightValue: right.weight },
      { label: "Goals",       leftValue: left.goals,       rightValue: right.goals },
      { label: "Assists",     leftValue: left.assists,     rightValue: right.assists },
    ];
  }, [profiles]);

  return (
    <section
      aria-labelledby="comparison-heading"
      className="border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)] dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 id="comparison-heading" className="text-xl font-black tracking-tight dark:text-zinc-100">
          Player Comparison
        </h3>
        <button
          type="button"
          onClick={onResetComparison}
          className="
            border-2 border-black bg-yellow-300 px-3 py-1 text-xs font-black uppercase tracking-[0.2em]
            hover:bg-black hover:text-white transition-all
            focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
            dark:border-zinc-600 dark:bg-yellow-400 dark:text-black dark:hover:bg-black dark:hover:text-white
          "
        >
          Clear
        </button>
      </div>

      {/* Selected players */}
      <ul role="list" className="mb-6 grid gap-3 md:grid-cols-2">
        {selectedPlayers.map((player) => (
          <li
            key={player.idPlayer}
            className="flex items-center justify-between border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <div>
              <p className="font-black dark:text-zinc-100">{player.strPlayer || "Unknown Player"}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                {player.strTeam || "No team listed"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemovePlayer(player.idPlayer ?? "")}
              aria-label={`Remove ${player.strPlayer} from comparison`}
              className="
                text-xs font-black uppercase tracking-[0.2em] text-red-700
                hover:underline focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-red-400
                dark:text-red-400
              "
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {selectedPlayers.length < 2 && (
        <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">
          Select {2 - selectedPlayers.length} more player to compare age, team, goals, assists, and more.
        </p>
      )}

      {loading && (
        <p role="status" aria-live="polite" className="font-semibold dark:text-zinc-300">
          Loading comparison stats…
        </p>
      )}

      {!loading && metrics.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <caption className="sr-only">
              Comparison between {profiles[0]?.name} and {profiles[1]?.name}
            </caption>
            <thead>
              <tr className="border-b-2 border-black text-xs uppercase tracking-[0.2em] text-slate-500 dark:border-zinc-700 dark:text-zinc-400">
                <th scope="col" className="py-2 pr-4">Metric</th>
                <th scope="col" className="py-2 pr-4">{profiles[0]?.name}</th>
                <th scope="col" className="py-2">{profiles[1]?.name}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr
                  key={metric.label}
                  className="border-b border-slate-200 text-sm dark:border-zinc-700"
                >
                  <td className="py-3 pr-4 font-black dark:text-zinc-100">{metric.label}</td>
                  <td className="py-3 pr-4 font-semibold dark:text-zinc-300">{metric.leftValue}</td>
                  <td className="py-3 font-semibold dark:text-zinc-300">{metric.rightValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && selectedPlayers.length === 2 && (
        <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          Note: Goals/assists depend on availability from TheSportsDB player profile endpoint.
        </p>
      )}
    </section>
  );
}

// ─── SearchResultsPage ────────────────────────────────────────────────────────

function SearchResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const query = searchParams.get("q")?.trim() ?? "";
  const mode = (searchParams.get("mode") as SearchMode | null) ?? "players";
  const comparePlayerName = searchParams.get("compare")?.trim() ?? "";

  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [selectedComparePlayers, setSelectedComparePlayers] = useState<PlayerResult[]>([]);
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [competitionTable, setCompetitionTable] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");

  const matchingCompetitions = useMemo(() => {
    if (!query) return [];
    const normalized = normalizeCompetitionQuery(query);
    return competitions.filter(
      (c) =>
        c.aliases.some((a) => a.includes(normalized)) ||
        c.name.toLowerCase().includes(normalized) ||
        c.country.toLowerCase().includes(normalized)
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
    if (!query) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        if (mode === "players") {
          const playerResults = await searchPlayer(query).catch(() => []);
          const nextPlayers = Array.isArray(playerResults) ? playerResults.slice(0, 8) : [];
          setPlayers(nextPlayers);

          if (comparePlayerName) {
            const normalized = comparePlayerName.toLowerCase();
            const comparePlayer =
              nextPlayers.find((p) => p.strPlayer?.toLowerCase() === normalized) ??
              nextPlayers.find((p) => p.strPlayer?.toLowerCase().includes(normalized));
            if (comparePlayer?.idPlayer) {
              setSelectedComparePlayers((cur) => {
                if (cur.some((p) => p.idPlayer === comparePlayer.idPlayer)) return cur;
                return [comparePlayer, ...cur].slice(0, 2);
              });
            }
          }
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
  }, [mode, query, matchingCompetitions, comparePlayerName]);

  useEffect(() => {
    if (!selectedCompetition) { setCompetitionTable([]); return; }
    const fetchTable = async () => {
      setTableLoading(true);
      try {
        const table = await getSportsDbLeagueTable(selectedCompetition.id, selectedCompetition.season);
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

  const addPlayerToCompare = (player: PlayerResult) => {
    if (!player.idPlayer) return;
    setSelectedComparePlayers((cur) => {
      if (cur.some((p) => p.idPlayer === player.idPlayer) || cur.length >= 2) return cur;
      return [...cur, player];
    });
  };

  const removePlayerFromCompare = (playerId: string) =>
    setSelectedComparePlayers((cur) => cur.filter((p) => p.idPlayer !== playerId));

  const clearComparePlayers = () => setSelectedComparePlayers([]);

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-8 py-10">
      <section
        aria-labelledby="search-results-heading"
        className="border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_rgba(0,0,0,1)] dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h1
          id="search-results-heading"
          className="mb-2 text-3xl font-black tracking-tight dark:text-zinc-100"
        >
          Global Search
        </h1>
        <p className="mb-6 text-sm font-semibold text-slate-600 dark:text-zinc-400">
          Search for players, teams, or competitions using the buttons below.
          {selectedComparePlayers.length === 1
            ? " One player is selected — search for another to compare."
            : ""}
        </p>

        <SearchBar
          initialValue={query}
          initialMode={mode}
          onSearch={handleSearch}
          placeholder="Try: Lionel Messi, English Premier League, or la liga"
        />

        <div className="mt-8 space-y-8" aria-live="polite" aria-busy={loading}>
          {loading && (
            <p role="status" className="font-semibold dark:text-zinc-300">Searching…</p>
          )}
          {error && (
            <p role="alert" className="font-semibold text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* ── Players ──────────────────────────────────────────────── */}
          {mode === "players" && !loading && (
            <section aria-labelledby="player-results-heading">
              <h2
                id="player-results-heading"
                className="mb-4 text-xl font-black tracking-tight dark:text-zinc-100"
              >
                Player Results for "{query}"
              </h2>

              {players.length ? (
                <ul role="list" className="grid gap-4 md:grid-cols-2">
                  {players.map((player) => (
                    <li key={player.idPlayer}>
                      <article className={cardCls}>
                        {player.strThumb ? (
                          <img
                            src={player.strThumb}
                            alt={player.strPlayer ?? "Player photo"}
                            className="h-24 w-24 shrink-0 object-cover"
                          />
                        ) : (
                          <div
                            aria-hidden="true"
                            className="flex h-24 w-24 shrink-0 items-center justify-center bg-yellow-300 text-xs font-black"
                          >
                            NO IMG
                          </div>
                        )}
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <h3 className="font-black dark:text-zinc-100">{player.strPlayer}</h3>
                            <p className="text-sm font-semibold dark:text-zinc-300">
                              {player.strTeam || "No team listed"}
                            </p>
                            <p className={mutedText}>
                              {player.strPosition || player.strSport || "Profile"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addPlayerToCompare(player)}
                            disabled={
                              !player.idPlayer ||
                              selectedComparePlayers.some((s) => s.idPlayer === player.idPlayer) ||
                              selectedComparePlayers.length >= 2
                            }
                            aria-label={
                              selectedComparePlayers.some((s) => s.idPlayer === player.idPlayer)
                                ? `${player.strPlayer} already selected for comparison`
                                : `Add ${player.strPlayer} to comparison`
                            }
                            className="
                              mt-3 w-fit border-2 border-black bg-yellow-300 px-3 py-1
                              text-[10px] font-black uppercase tracking-[0.2em] text-black
                              transition-all hover:bg-black hover:text-white
                              focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
                              disabled:cursor-not-allowed disabled:opacity-50
                              dark:border-zinc-600 dark:bg-yellow-400 dark:hover:bg-black dark:hover:text-white
                            "
                          >
                            {selectedComparePlayers.some((s) => s.idPlayer === player.idPlayer)
                              ? "Selected"
                              : "Add to Compare"}
                          </button>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-semibold text-slate-500 dark:text-zinc-400">
                  No players found for this search.
                </p>
              )}

              <div className="mt-6">
                <PlayerComparisonPanel
                  selectedPlayers={selectedComparePlayers}
                  onRemovePlayer={removePlayerFromCompare}
                  onResetComparison={clearComparePlayers}
                />
              </div>
            </section>
          )}

          {/* ── Teams ────────────────────────────────────────────────── */}
          {mode === "teams" && !loading && (
            <section aria-labelledby="team-results-heading">
              <h2
                id="team-results-heading"
                className="mb-4 text-xl font-black tracking-tight dark:text-zinc-100"
              >
                Team Results for "{query}"
              </h2>

              {teams.length ? (
                <div className="max-h-144 overflow-y-auto pr-2">
                  <ul role="list" className="grid gap-4 md:grid-cols-2">
                    {teams.map((team) => (
                      <li key={team.idTeam}>
                        <article className={cardCls}>
                          {team.strTeamBadge ? (
                            <img
                              src={team.strTeamBadge}
                              alt={`${team.strTeam} badge`}
                              className="h-20 w-20 shrink-0 object-contain"
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="flex h-20 w-20 shrink-0 items-center justify-center bg-black text-xs font-black text-white"
                            >
                              NO BADGE
                            </div>
                          )}
                          <div>
                            <h3 className="font-black dark:text-zinc-100">{team.strTeam}</h3>
                            <p className="text-sm font-semibold dark:text-zinc-300">{team.strLeague}</p>
                            <p className={mutedText}>{team.strCountry || "Club"}</p>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="font-semibold text-slate-500 dark:text-zinc-400">
                  No team results found. Try a club name like Barcelona, Arsenal, or Inter Miami.
                </p>
              )}
            </section>
          )}

          {/* ── Competitions ─────────────────────────────────────────── */}
          {mode === "competitions" && !loading && (
            <section aria-labelledby="competition-results-heading" className="space-y-6">
              <div>
                <h2
                  id="competition-results-heading"
                  className="mb-4 text-xl font-black tracking-tight dark:text-zinc-100"
                >
                  Competition Results for "{query}"
                </h2>

                {matchingCompetitions.length ? (
                  <ul role="list" className="grid gap-4 md:grid-cols-2">
                    {matchingCompetitions.map((competition) => {
                      const selected = selectedCompetition?.id === competition.id;
                      return (
                        <li key={competition.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedCompetition(competition)}
                            aria-pressed={selected}
                            aria-label={`${competition.name} — click to view league table`}
                            className={`
                              flex w-full items-center gap-4 border-2 p-4 text-left transition-all
                              focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
                              ${selected
                                ? "border-black bg-yellow-100 dark:border-yellow-400 dark:bg-yellow-900/20"
                                : "border-slate-200 bg-slate-50 hover:border-black dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-400"
                              }
                            `}
                          >
                            <div
                              aria-hidden="true"
                              className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-black bg-yellow-400 text-lg font-black text-black"
                            >
                              {competition.label}
                            </div>
                            <div>
                              <p className="font-black dark:text-zinc-100">{competition.name}</p>
                              <p className="text-sm font-semibold dark:text-zinc-300">{competition.country}</p>
                              <p className={mutedText}>Click to view league table</p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="font-semibold text-slate-500 dark:text-zinc-400">
                    No competitions found. Try names like la liga, premier league, bundesliga, or serie a.
                  </p>
                )}
              </div>

              {selectedCompetition && (
                <section
                  aria-labelledby="league-table-heading"
                  aria-live="polite"
                  aria-busy={tableLoading}
                  className="border border-slate-200 bg-slate-50 p-6 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <h3
                    id="league-table-heading"
                    className="mb-4 text-2xl font-black tracking-tight dark:text-zinc-100"
                  >
                    {selectedCompetition.name} Table
                  </h3>

                  {tableLoading ? (
                    <p role="status" className="font-semibold dark:text-zinc-300">
                      Loading league table…
                    </p>
                  ) : competitionTable.length ? (
                    <div className="max-h-128 overflow-y-auto">
                      <table className="w-full border-collapse">
                        <caption className="sr-only">{selectedCompetition.name} standings</caption>
                        <thead>
                          <tr className="border-b pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:border-zinc-700 dark:text-zinc-400">
                            <th scope="col" className="py-2 pr-2 text-left">Pos</th>
                            <th scope="col" className="py-2 pr-2 text-left">Team</th>
                            <th scope="col" className="py-2 pr-2 text-left">Played</th>
                            <th scope="col" className="py-2 text-left">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competitionTable.map((row) => (
                            <tr
                              key={`${row.intRank}-${row.strTeam}`}
                              className="border-b border-slate-200 py-3 text-sm font-semibold dark:border-zinc-700 dark:text-zinc-300"
                            >
                              <td className="py-3 pr-2">{row.intRank}</td>
                              <td className="py-3 pr-2">{row.strTeam}</td>
                              <td className="py-3 pr-2">{row.intPlayed}</td>
                              <td className="py-3 font-black dark:text-zinc-100">{row.intPoints}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="font-semibold text-slate-500 dark:text-zinc-400">
                      No table data found for this competition.
                    </p>
                  )}
                </section>
              )}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

export default SearchResultsPage;