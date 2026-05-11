import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SearchBar from "../../components/SearchBar";
import type { SearchMode } from "../../components/SearchBar";
import {
  getExpandedLeagueTable,
  getPlayersByTeamId,
  getPlayerStats,
  searchPlayer,
  searchTeam,
} from "../../sportsdbaAPI";

type TeamResult = {
  idTeam?: string;
  strTeam?: string;
  strLeague?: string;
  strTeamBadge?: string;
  strCountry?: string;
  strStadium?: string;
  strDescriptionEN?: string;
};

type PlayerResult = {
  idPlayer?: string;
  strPlayer?: string;
  strTeam?: string;
  strSport?: string;
  strThumb?: string;
  strPosition?: string;
  strNationality?: string;
  strAge?: string;
  strHeight?: string;
  strWeight?: string;
  intGoals?: string;
  intAssists?: string;
  strDescriptionEN?: string;
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

type FavoritePlayerRecord = {
  externalId: string;
};

type FavoriteTeamRecord = {
  externalId: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
const AUTH_ERROR_MESSAGES = new Set([
  "Invalid or expired token.",
  "Authentication token is required.",
  "User session is no longer valid.",
  "This session has been revoked.",
]);

const clearStoredAuth = () => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth-changed"));
};

const isAuthFailure = (status: number, message?: string) =>
  status === 401 || status === 403 || AUTH_ERROR_MESSAGES.has(message || "");

const EMPTY_VALUE = "Not listed";

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

const toDisplay = (value?: string | null) => {
  if (!value || !value.trim()) {
    return EMPTY_VALUE;
  }

  return value;
};

const buildPlayerProfile = (
  fallback: PlayerResult,
  apiProfile?: Record<string, string | null>
): PlayerComparisonProfile => {
  return {
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
  };
};

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
    if (selectedPlayers.length !== 2 || !selectedPlayers.every((player) => player.idPlayer)) {
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
        setProfiles(selectedPlayers.map((player) => buildPlayerProfile(player)));
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerProfiles();
  }, [selectedPlayers]);

  const metrics = useMemo<ComparisonMetric[]>(() => {
    if (profiles.length !== 2) {
      return [];
    }

    const [left, right] = profiles;

    return [
      { label: "Team", leftValue: left.team, rightValue: right.team },
      { label: "Age", leftValue: left.age, rightValue: right.age },
      { label: "Position", leftValue: left.position, rightValue: right.position },
      { label: "Nationality", leftValue: left.nationality, rightValue: right.nationality },
      { label: "Height", leftValue: left.height, rightValue: right.height },
      { label: "Weight", leftValue: left.weight, rightValue: right.weight },
      { label: "Goals", leftValue: left.goals, rightValue: right.goals },
      { label: "Assists", leftValue: left.assists, rightValue: right.assists },
    ].filter((metric) => metric.leftValue !== EMPTY_VALUE || metric.rightValue !== EMPTY_VALUE);
  }, [profiles]);

  return (
    <section className="border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-black tracking-tight">Player Comparison</h3>
        <button
          onClick={onResetComparison}
          className="border-2 border-black bg-yellow-300 px-3 py-1 text-xs font-black uppercase tracking-[0.2em]"
        >
          Clear
        </button>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        {selectedPlayers.map((player) => (
          <div key={player.idPlayer} className="flex items-center justify-between border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="font-black">{player.strPlayer || "Unknown Player"}</p>
              <p className="text-xs font-semibold text-slate-500">{player.strTeam || "Club not listed"}</p>
            </div>
            <button
              onClick={() => onRemovePlayer(player.idPlayer ?? "")}
              className="text-xs font-black uppercase tracking-[0.2em] text-red-700"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {selectedPlayers.length < 2 ? (
        <p className="text-sm font-semibold text-slate-500">
          Select {2 - selectedPlayers.length} more player to compare age, team, goals, assists, and more.
        </p>
      ) : null}

      {loading ? <p className="font-semibold">Loading comparison stats...</p> : null}

      {!loading && metrics.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-black text-xs uppercase tracking-[0.2em] text-slate-500">
                <th className="py-2 pr-4">Metric</th>
                <th className="py-2 pr-4">{profiles[0]?.name}</th>
                <th className="py-2">{profiles[1]?.name}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.label} className="border-b border-slate-200 text-sm">
                  <td className="py-3 pr-4 font-black">{metric.label}</td>
                  <td className="py-3 pr-4 font-semibold">{metric.leftValue}</td>
                  <td className="py-3 font-semibold">{metric.rightValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && selectedPlayers.length === 2 ? (
        <p className="mt-4 text-xs font-semibold text-slate-500">
          Note: Goals/assists depend on availability from TheSportsDB player profile endpoint.
        </p>
      ) : null}
    </section>
  );
}

type TableRow = {
  intRank?: string | number;
  strTeam?: string;
  intPlayed?: string | number;
  intPoints?: string | number;
  isRosterOnly?: boolean;
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

type DetailModal =
  | { type: "player"; player: PlayerResult }
  | { type: "team"; team: TeamResult }
  | { type: "league"; competition: Competition }
  | null;

interface DetailsModalProps {
  modal: DetailModal;
  onClose: () => void;
  onOpenPlayer: (player: PlayerResult) => void;
  onOpenTeamByName: (teamName: string) => void;
}

function DetailsModal({ modal, onClose, onOpenPlayer, onOpenTeamByName }: DetailsModalProps) {
  const [playerProfile, setPlayerProfile] = useState<PlayerResult | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<PlayerResult[]>([]);
  const [leagueTable, setLeagueTable] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPlayerProfile(null);
    setTeamPlayers([]);
    setLeagueTable([]);

    if (!modal) {
      return;
    }

    const loadDetails = async () => {
      setLoading(true);

      try {
        if (modal.type === "player" && modal.player.idPlayer) {
          const players = await getPlayerStats(modal.player.idPlayer);
          setPlayerProfile((Array.isArray(players) ? players[0] : null) || modal.player);
        }

        if (modal.type === "team" && modal.team.idTeam) {
          const roster = await getPlayersByTeamId(modal.team.idTeam);
          setTeamPlayers(Array.isArray(roster) ? roster.slice(0, 40) : []);
        }

        if (modal.type === "league") {
          const table = await getExpandedLeagueTable(
            modal.competition.id,
            modal.competition.season,
            modal.competition.name
          );
          setLeagueTable(Array.isArray(table) ? table : []);
        }
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [modal]);

  if (!modal) {
    return null;
  }

  const closeOnBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const renderPlayer = () => {
    if (modal.type !== "player") {
      return null;
    }

    const profile = playerProfile || modal.player;
    const playerName = profile.strPlayer || modal.player.strPlayer || "Player";
    const stats = [
      ["Team", profile.strTeam],
      ["Position", profile.strPosition],
      ["Nationality", profile.strNationality],
      ["Age", profile.strAge],
      ["Height", profile.strHeight],
      ["Weight", profile.strWeight],
      ["Goals", profile.intGoals],
      ["Assists", profile.intAssists],
    ].filter(([, value]) => value && value !== EMPTY_VALUE);

    return (
      <>
        <div className="grid gap-5 md:grid-cols-[11rem_1fr]">
          <img
            src={profile.strThumb || buildFallbackImage(playerName)}
            alt={playerName}
            className="h-44 w-44 border-2 border-black object-cover"
          />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-600">Player Profile</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">{playerName}</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">{profile.strTeam || "Team not listed"}</p>
            {profile.strTeam ? (
              <button
                type="button"
                onClick={() => onOpenTeamByName(profile.strTeam!)}
                className="mt-4 border-2 border-black bg-yellow-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em]"
              >
                View Team Players
              </button>
            ) : null}
          </div>
        </div>

        {loading ? <p className="mt-5 font-semibold">Loading player stats...</p> : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {stats.map(([label, value]) => (
            <div key={label} className="border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
              <p className="mt-1 font-black">{value}</p>
            </div>
          ))}
        </div>

        {profile.strDescriptionEN ? (
          <p className="mt-5 max-h-36 overflow-y-auto text-sm font-semibold leading-6 text-slate-600">
            {profile.strDescriptionEN}
          </p>
        ) : null}
      </>
    );
  };

  const renderTeam = () => {
    if (modal.type !== "team") {
      return null;
    }

    const teamName = modal.team.strTeam || "Team";

    return (
      <>
        <div className="grid gap-5 md:grid-cols-[8rem_1fr]">
          <img
            src={modal.team.strTeamBadge || buildFallbackImage(teamName)}
            alt={teamName}
            className="h-32 w-32 border-2 border-black bg-white object-contain"
          />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-600">Team Roster</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">{teamName}</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">{modal.team.strLeague || "League not listed"}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              {modal.team.strCountry || "Country not listed"}
            </p>
          </div>
        </div>

        {loading ? <p className="mt-5 font-semibold">Loading players...</p> : null}

        {!loading && teamPlayers.length ? (
          <div className="mt-6 max-h-80 overflow-y-auto border border-slate-200">
            {teamPlayers.map((player) => (
              <button
                key={player.idPlayer || player.strPlayer}
                type="button"
                onClick={() => onOpenPlayer(player)}
                className="grid w-full grid-cols-[3.5rem_1fr] items-center gap-3 border-b border-slate-200 bg-white p-3 text-left transition-colors hover:bg-yellow-100"
              >
                <img
                  src={player.strThumb || buildFallbackImage(player.strPlayer || "Player")}
                  alt={player.strPlayer || "Player"}
                  className="h-12 w-12 border border-black object-cover"
                />
                <div>
                  <p className="font-black">{player.strPlayer || "Player"}</p>
                  <p className="text-xs font-semibold text-slate-500">{player.strPosition || player.strSport || "Profile"}</p>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {!loading && !teamPlayers.length ? (
          <p className="mt-5 font-semibold text-slate-500">No roster was returned for this team.</p>
        ) : null}
      </>
    );
  };

  const renderLeague = () => {
    if (modal.type !== "league") {
      return null;
    }

    return (
      <>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center border-2 border-black bg-yellow-400 text-lg font-black">
            {modal.competition.label}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-600">Standings</p>
            <h2 className="text-3xl font-black tracking-tight">{modal.competition.name}</h2>
            <p className="text-sm font-bold text-slate-600">{modal.competition.season}</p>
          </div>
        </div>

        {loading ? <p className="mt-5 font-semibold">Loading standings...</p> : null}

        {!loading && leagueTable.length ? (
          <div className="mt-6 max-h-[65vh] overflow-y-auto border border-slate-200">
            <div className="sticky top-0 z-10 grid grid-cols-12 border-b bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              <span className="col-span-1">Pos</span>
              <span className="col-span-6">Team</span>
              <span className="col-span-2">Played</span>
              <span className="col-span-3">Points</span>
            </div>
            {leagueTable.map((row) => (
              <button
                key={`${row.intRank}-${row.strTeam}`}
                type="button"
                onClick={() => row.strTeam && onOpenTeamByName(String(row.strTeam))}
                className="grid w-full grid-cols-12 border-b px-3 py-3 text-left text-sm font-semibold transition-colors hover:bg-yellow-100"
              >
                <span className="col-span-1">{row.intRank}</span>
                <span className="col-span-6">{row.strTeam}</span>
                <span className="col-span-2">{row.intPlayed}</span>
                <span className="col-span-3 font-black">{row.intPoints}</span>
                {row.isRosterOnly ? (
                  <span className="col-span-12 mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Standings stats unavailable from provider
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        {!loading && !leagueTable.length ? (
          <p className="mt-5 font-semibold text-slate-500">Standings were not returned for this season.</p>
        ) : null}
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={closeOnBackdrop}
    >
      <section className="max-h-[94vh] w-full max-w-4xl overflow-y-auto border-4 border-black bg-white p-6 shadow-[10px_10px_0_0_rgba(250,204,21,1)]">
        <div className="mb-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white"
          >
            Close
          </button>
        </div>
        {renderPlayer()}
        {renderTeam()}
        {renderLeague()}
      </section>
    </div>
  );
}

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
  const [favoritePlayerIds, setFavoritePlayerIds] = useState<string[]>([]);
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>([]);
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [favoriteLoadingId, setFavoriteLoadingId] = useState("");
  const [detailModal, setDetailModal] = useState<DetailModal>(null);

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
          const nextPlayers = Array.isArray(playerResults) ? playerResults.slice(0, 8) : [];
          setPlayers(nextPlayers);

          if (comparePlayerName) {
            const normalizedCompareName = comparePlayerName.toLowerCase();
            const comparePlayer =
              nextPlayers.find((player) => player.strPlayer?.toLowerCase() === normalizedCompareName) ??
              nextPlayers.find((player) => player.strPlayer?.toLowerCase().includes(normalizedCompareName));

            if (comparePlayer?.idPlayer) {
              setSelectedComparePlayers((current) => {
                if (current.some((player) => player.idPlayer === comparePlayer.idPlayer)) {
                  return current;
                }

                return [comparePlayer, ...current].slice(0, 2);
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
    if (!selectedCompetition) {
      setCompetitionTable([]);
      return;
    }

    const fetchTable = async () => {
      setTableLoading(true);

      try {
        const table = await getExpandedLeagueTable(
          selectedCompetition.id,
          selectedCompetition.season,
          selectedCompetition.name
        );
        setCompetitionTable(Array.isArray(table) ? table : []);
      } catch (err) {
        console.error("League table fetch failed:", err);
        setCompetitionTable([]);
      } finally {
        setTableLoading(false);
      }
    };

    fetchTable();
  }, [selectedCompetition]);

  useEffect(() => {
    const loadFavorites = async () => {
      const nextToken = localStorage.getItem("token");

      if (!nextToken) {
        setFavoritePlayerIds([]);
        setFavoriteTeamIds([]);
        return;
      }

      try {
        const [playerResponse, teamResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/favorites/players`, {
            headers: {
              Authorization: `Bearer ${nextToken}`,
            },
          }),
          fetch(`${API_BASE_URL}/api/favorites/teams`, {
            headers: {
              Authorization: `Bearer ${nextToken}`,
            },
          }),
        ]);

        const playerData = await playerResponse.json();
        const teamData = await teamResponse.json();

        if (!playerResponse.ok || !teamResponse.ok) {
          const message = playerData.message || teamData.message || "Could not load favorites.";
          if (
            isAuthFailure(
              !playerResponse.ok ? playerResponse.status : teamResponse.status,
              playerData.message || teamData.message
            )
          ) {
            clearStoredAuth();
            setFavoritePlayerIds([]);
            setFavoriteTeamIds([]);
            setFavoriteMessage("Your session expired. Log in again to save favorites.");
            return;
          }

          setFavoriteMessage(message);
          return;
        }

        setFavoritePlayerIds(
          Array.isArray(playerData.favorites)
            ? playerData.favorites.map((entry: FavoritePlayerRecord) => entry.externalId).filter(Boolean)
            : []
        );
        setFavoriteTeamIds(
          Array.isArray(teamData.favorites)
            ? teamData.favorites.map((entry: FavoriteTeamRecord) => entry.externalId).filter(Boolean)
            : []
        );
      } catch (loadError) {
        console.error("Favorite load failed:", loadError);
        setFavoriteMessage("Could not connect to backend favorites.");
      }
    };

    loadFavorites();
    window.addEventListener("auth-changed", loadFavorites);

    return () => {
      window.removeEventListener("auth-changed", loadFavorites);
    };
  }, []);

  const addPlayerToCompare = (player: PlayerResult) => {
    if (!player.idPlayer) {
      return;
    }

    setSelectedComparePlayers((current) => {
      if (current.some((item) => item.idPlayer === player.idPlayer) || current.length >= 2) {
        return current;
      }

      return [...current, player];
    });
  };

  const removePlayerFromCompare = (playerId: string) => {
    setSelectedComparePlayers((current) => current.filter((item) => item.idPlayer !== playerId));
  };

  const clearComparePlayers = () => {
    setSelectedComparePlayers([]);
  };

  const openPlayerDetails = (player: PlayerResult) => {
    setDetailModal({ type: "player", player });
  };

  const openTeamDetails = (team: TeamResult) => {
    setDetailModal({ type: "team", team });
  };

  const openTeamDetailsByName = async (teamName: string) => {
    setDetailModal({ type: "team", team: { strTeam: teamName } });

    const teamResults = await searchTeam(teamName).catch(() => []);
    const matchedTeam = Array.isArray(teamResults)
      ? teamResults.find((team) => team.strTeam?.toLowerCase() === teamName.toLowerCase()) ?? teamResults[0]
      : null;

    if (matchedTeam) {
      setDetailModal({ type: "team", team: matchedTeam });
    }
  };

  const toggleFavoritePlayer = async (player: PlayerResult) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setFavoriteMessage("Log in to save favorite players.");
      return;
    }

    if (!player.idPlayer) {
      setFavoriteMessage("This player result is missing an API id.");
      return;
    }

    const isSaved = favoritePlayerIds.includes(player.idPlayer);
    setFavoriteLoadingId(`player-${player.idPlayer}`);
    setFavoriteMessage("");

    try {
      const response = await fetch(
        isSaved
          ? `${API_BASE_URL}/api/favorites/players/${encodeURIComponent(player.idPlayer)}`
          : `${API_BASE_URL}/api/favorites/players`,
        {
          method: isSaved ? "DELETE" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: isSaved ? undefined : JSON.stringify({ player }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        if (isAuthFailure(response.status, data.message)) {
          clearStoredAuth();
          setFavoritePlayerIds([]);
          setFavoriteTeamIds([]);
          setFavoriteMessage("Your session expired. Log in again to save favorites.");
          return;
        }

        setFavoriteMessage(data.message || "Could not update favorite player.");
        return;
      }

      setFavoritePlayerIds((current) =>
        isSaved
          ? current.filter((id) => id !== player.idPlayer)
          : [...current, player.idPlayer!]
      );
      setFavoriteMessage(data.message || (isSaved ? "Favorite player removed." : "Favorite player saved."));
    } catch (saveError) {
      console.error("Favorite player update failed:", saveError);
      setFavoriteMessage("Could not connect to backend favorites.");
    } finally {
      setFavoriteLoadingId("");
    }
  };

  const toggleFavoriteTeam = async (team: TeamResult) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setFavoriteMessage("Log in to save favorite teams.");
      return;
    }

    if (!team.idTeam) {
      setFavoriteMessage("This team result is missing an API id.");
      return;
    }

    const isSaved = favoriteTeamIds.includes(team.idTeam);
    setFavoriteLoadingId(`team-${team.idTeam}`);
    setFavoriteMessage("");

    try {
      const response = await fetch(
        isSaved
          ? `${API_BASE_URL}/api/favorites/teams/${encodeURIComponent(team.idTeam)}`
          : `${API_BASE_URL}/api/favorites/teams`,
        {
          method: isSaved ? "DELETE" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: isSaved ? undefined : JSON.stringify({ team }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        if (isAuthFailure(response.status, data.message)) {
          clearStoredAuth();
          setFavoritePlayerIds([]);
          setFavoriteTeamIds([]);
          setFavoriteMessage("Your session expired. Log in again to save favorites.");
          return;
        }

        setFavoriteMessage(data.message || "Could not update favorite team.");
        return;
      }

      setFavoriteTeamIds((current) =>
        isSaved
          ? current.filter((id) => id !== team.idTeam)
          : [...current, team.idTeam!]
      );
      setFavoriteMessage(data.message || (isSaved ? "Favorite team removed." : "Favorite team saved."));
    } catch (saveError) {
      console.error("Favorite team update failed:", saveError);
      setFavoriteMessage("Could not connect to backend favorites.");
    } finally {
      setFavoriteLoadingId("");
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <section className="border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
        <h1 className="mb-2 text-3xl font-black tracking-tight">Global Search</h1>
        <p className="mb-6 text-sm font-semibold text-slate-600">
          Search for players, teams, or competitions using the buttons below.
          {selectedComparePlayers.length === 1 ? " One player is selected, search for another player to compare." : ""}
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
          {favoriteMessage ? <p className="font-semibold text-slate-600">{favoriteMessage}</p> : null}

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
                      onClick={() => openPlayerDetails(player)}
                      className="flex cursor-pointer gap-4 border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-black hover:bg-yellow-50"
                    >
                      <img
                        src={player.strThumb || buildFallbackImage(player.strPlayer || query || "PLAYER")}
                        alt={player.strPlayer ?? "Player"}
                        className="h-24 w-24 object-cover"
                      />
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h3 className="font-black">{player.strPlayer || query || "Player result"}</h3>
                          <p className="text-sm font-semibold">{player.strTeam || "Club not listed"}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            {player.strPosition || player.strSport || "Profile"}
                          </p>
                        </div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            addPlayerToCompare(player);
                          }}
                          disabled={
                            !player.idPlayer ||
                            selectedComparePlayers.some((selected) => selected.idPlayer === player.idPlayer) ||
                            selectedComparePlayers.length >= 2
                          }
                          className="mt-3 w-fit border-2 border-black bg-yellow-300 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {selectedComparePlayers.some((selected) => selected.idPlayer === player.idPlayer)
                            ? "Selected"
                            : "Add to Compare"}
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFavoritePlayer(player);
                          }}
                          disabled={!player.idPlayer || favoriteLoadingId === `player-${player.idPlayer}`}
                          className="mt-2 w-fit border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {favoriteLoadingId === `player-${player.idPlayer}`
                            ? "Saving..."
                            : favoritePlayerIds.includes(player.idPlayer ?? "")
                              ? "Remove Favorite"
                              : "Save Favorite"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="font-semibold text-slate-500">No players found for this search.</p>
              )}

              <div className="mt-6">
                <PlayerComparisonPanel
                  selectedPlayers={selectedComparePlayers}
                  onRemovePlayer={removePlayerFromCompare}
                  onResetComparison={clearComparePlayers}
                />
              </div>
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
                        onClick={() => openTeamDetails(team)}
                        className="flex cursor-pointer gap-4 border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-black hover:bg-yellow-50"
                      >
                        <img
                          src={team.strTeamBadge || buildFallbackImage(team.strTeam || query || "TEAM")}
                          alt={team.strTeam ?? "Team"}
                          className="h-20 w-20 object-contain bg-white"
                        />
                        <div>
                          <h3 className="font-black">{team.strTeam || query || "Team result"}</h3>
                          <p className="text-sm font-semibold">{team.strLeague || "League not listed"}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            {team.strCountry || "Club"}
                          </p>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavoriteTeam(team);
                            }}
                            disabled={!team.idTeam || favoriteLoadingId === `team-${team.idTeam}`}
                            className="mt-3 border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {favoriteLoadingId === `team-${team.idTeam}`
                              ? "Saving..."
                              : favoriteTeamIds.includes(team.idTeam ?? "")
                                ? "Remove Favorite"
                                : "Save Favorite"}
                          </button>
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
                        onClick={() => {
                          setSelectedCompetition(competition);
                          setDetailModal({ type: "league", competition });
                        }}
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
                            Click to view standings
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
                    <div className="max-h-[70vh] overflow-y-auto border border-slate-200">
                      <div className="sticky top-0 z-10 grid grid-cols-12 border-b bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        <span className="col-span-1">Pos</span>
                        <span className="col-span-6">Team</span>
                        <span className="col-span-2">Played</span>
                        <span className="col-span-3">Points</span>
                      </div>
                      {competitionTable.map((row) => (
                        <div
                          key={`${row.intRank}-${row.strTeam}`}
                          className="grid grid-cols-12 border-b px-3 py-3 text-sm font-semibold"
                        >
                          <span className="col-span-1">{row.intRank}</span>
                          <button
                            type="button"
                            onClick={() => row.strTeam && openTeamDetailsByName(String(row.strTeam))}
                            className="col-span-6 text-left font-black hover:text-yellow-700"
                          >
                            {row.strTeam}
                          </button>
                          <span className="col-span-2">{row.intPlayed}</span>
                          <span className="col-span-3 font-black">{row.intPoints}</span>
                          {row.isRosterOnly ? (
                            <span className="col-span-12 mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              Standings stats unavailable from provider
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-black">Standings were not returned for the selected season.</p>
                      <p className="text-sm font-semibold text-slate-500">
                        {selectedCompetition.country} | {selectedCompetition.season} | {selectedCompetition.label}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
      <DetailsModal
        modal={detailModal}
        onClose={() => setDetailModal(null)}
        onOpenPlayer={openPlayerDetails}
        onOpenTeamByName={openTeamDetailsByName}
      />
    </main>
  );
}

export default SearchResultsPage;
