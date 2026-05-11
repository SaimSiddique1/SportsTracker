import { useEffect, useMemo, useRef, useState } from "react";
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

// ─── Types ──────────────────────────────────────────────────────────────────

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

type ComparisonMetric = { label: string; leftValue: string; rightValue: string };
type FavoritePlayerRecord = { externalId: string };
type FavoriteTeamRecord = { externalId: string };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
const AUTH_ERROR_MESSAGES = new Set([
  "Invalid or expired token.",
  "Authentication token is required.",
  "User session is no longer valid.",
  "This session has been revoked.",
]);

const clearStoredAuth = () => {
  if (typeof window === "undefined") return;
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

const toDisplay = (value?: string | null) => (!value || !value.trim() ? EMPTY_VALUE : value);

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

// ─── Focus trap hook ─────────────────────────────────────────────────────────

function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const container = ref.current;
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
      );

    getFocusable()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = getFocusable();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [active]);

  return ref;
}

// ─── Player Comparison Panel ─────────────────────────────────────────────────

interface PlayerComparisonPanelProps {
  selectedPlayers: PlayerResult[];
  onRemovePlayer: (id: string) => void;
  onResetComparison: () => void;
}

function PlayerComparisonPanel({ selectedPlayers, onRemovePlayer, onResetComparison }: PlayerComparisonPanelProps) {
  const [profiles, setProfiles] = useState<PlayerComparisonProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPlayers.length !== 2 || !selectedPlayers.every((p) => p.idPlayer)) {
      setProfiles([]);
      return;
    }
    const fetchProfiles = async () => {
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
    fetchProfiles();
  }, [selectedPlayers]);

  const metrics = useMemo<ComparisonMetric[]>(() => {
    if (profiles.length !== 2) return [];
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
    ].filter((m) => m.leftValue !== EMPTY_VALUE || m.rightValue !== EMPTY_VALUE);
  }, [profiles]);

  return (
    <section
      aria-labelledby="comparison-heading"
      className="border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)] dark:bg-zinc-900 dark:border-zinc-700"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 id="comparison-heading" className="text-xl font-black tracking-tight">
          Player Comparison
        </h2>
        <button
          onClick={onResetComparison}
          aria-label="Clear player comparison"
          className="
            border-2 border-black bg-yellow-300 px-3 py-1
            text-xs font-black uppercase tracking-[0.2em]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 dark:text-black
          "
        >
          Clear
        </button>
      </div>

      {/* Selected players chips */}
      <div className="mb-6 grid gap-3 md:grid-cols-2" role="list" aria-label="Players selected for comparison">
        {selectedPlayers.map((player) => (
          <div
            key={player.idPlayer}
            role="listitem"
            className="flex items-center justify-between border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <div>
              <p className="font-black">{player.strPlayer || "Unknown Player"}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">{player.strTeam || "Club not listed"}</p>
            </div>
            <button
              onClick={() => onRemovePlayer(player.idPlayer ?? "")}
              aria-label={`Remove ${player.strPlayer ?? "player"} from comparison`}
              className="
                text-xs font-black uppercase tracking-[0.2em] text-red-700
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1
                dark:text-red-400
              "
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {selectedPlayers.length < 2 ? (
        <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400" aria-live="polite">
          Select {2 - selectedPlayers.length} more player{2 - selectedPlayers.length === 1 ? "" : "s"} to compare.
        </p>
      ) : null}

      {loading ? (
        <p aria-live="polite" className="font-semibold">Loading comparison stats…</p>
      ) : null}

      {!loading && metrics.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left" aria-label="Player comparison statistics">
            <thead>
              <tr className="border-b-2 border-black text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
                <th scope="col" className="py-2 pr-4">Metric</th>
                <th scope="col" className="py-2 pr-4">{profiles[0]?.name}</th>
                <th scope="col" className="py-2">{profiles[1]?.name}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.label} className="border-b border-slate-200 text-sm dark:border-zinc-700">
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
        <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          Note: Goals/assists depend on availability from TheSportsDB player profile endpoint.
        </p>
      ) : null}
    </section>
  );
}

// ─── Competitions config ──────────────────────────────────────────────────────

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
  { id: "4328", label: "PL", name: "English Premier League", country: "England", season: "2024-2025", aliases: ["premier league", "english premier league", "epl", "premierleague"] },
  { id: "4335", label: "LL", name: "Spanish La Liga", country: "Spain", season: "2024-2025", aliases: ["la liga", "spanish la liga", "laliga"] },
  { id: "4331", label: "BL", name: "German Bundesliga", country: "Germany", season: "2024-2025", aliases: ["bundesliga", "german bundesliga"] },
  { id: "4332", label: "SA", name: "Italian Serie A", country: "Italy", season: "2024-2025", aliases: ["serie a", "italian serie a", "seriea"] },
  { id: "4334", label: "L1", name: "French Ligue 1", country: "France", season: "2024-2025", aliases: ["ligue 1", "french ligue 1", "ligue1"] },
];

const normalizeCompetitionQuery = (query: string) => query.trim().toLowerCase();

// ─── Details Modal ────────────────────────────────────────────────────────────

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

  // Focus trap
  const trapRef = useFocusTrap(!!modal) as React.RefObject<HTMLElement>;

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  // Escape to close
  useEffect(() => {
    if (!modal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modal, onClose]);

  useEffect(() => {
    setPlayerProfile(null);
    setTeamPlayers([]);
    setLeagueTable([]);
    if (!modal) return;

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
          const table = await getExpandedLeagueTable(modal.competition.id, modal.competition.season, modal.competition.name);
          setLeagueTable(Array.isArray(table) ? table : []);
        }
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [modal]);

  if (!modal) return null;

  const closeOnBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const modalTitle =
    modal.type === "player"
      ? modal.player.strPlayer || "Player Profile"
      : modal.type === "team"
      ? modal.team.strTeam || "Team Roster"
      : modal.competition.name;

  const renderPlayer = () => {
    if (modal.type !== "player") return null;
    const profile = playerProfile || modal.player;
    const playerName = profile.strPlayer || modal.player.strPlayer || "Player";
    const stats: [string, string | undefined][] = [
      ["Team", profile.strTeam],
      ["Position", profile.strPosition],
      ["Nationality", profile.strNationality],
      ["Age", profile.strAge],
      ["Height", profile.strHeight],
      ["Weight", profile.strWeight],
      ["Goals", profile.intGoals],
      ["Assists", profile.intAssists],
    ].filter(([, v]) => v && v !== EMPTY_VALUE) as [string, string][];

    return (
      <>
        <div className="grid gap-5 md:grid-cols-[11rem_1fr]">
          <img
            src={profile.strThumb || buildFallbackImage(playerName)}
            alt={`${playerName} player photo`}
            className="h-44 w-44 border-2 border-black object-cover"
          />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-600">Player Profile</p>
            <h2 id="detail-modal-title" className="mt-2 text-3xl font-black tracking-tight">{playerName}</h2>
            <p className="mt-1 text-sm font-bold text-slate-600 dark:text-zinc-400">{profile.strTeam || "Team not listed"}</p>
            {profile.strTeam ? (
              <button
                type="button"
                onClick={() => onOpenTeamByName(profile.strTeam!)}
                className="
                  mt-4 border-2 border-black bg-yellow-300 px-3 py-2
                  text-[10px] font-black uppercase tracking-[0.2em]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:text-black
                "
              >
                View Team Players
              </button>
            ) : null}
          </div>
        </div>

        {loading ? <p aria-live="polite" className="mt-5 font-semibold">Loading player stats…</p> : null}

        {stats.length > 0 && (
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {stats.map(([label, value]) => (
              <div key={label} className="border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">{label}</dt>
                <dd className="mt-1 font-black">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {profile.strDescriptionEN ? (
          <p className="mt-5 max-h-36 overflow-y-auto text-sm font-semibold leading-6 text-slate-600 dark:text-zinc-400">
            {profile.strDescriptionEN}
          </p>
        ) : null}
      </>
    );
  };

  const renderTeam = () => {
    if (modal.type !== "team") return null;
    const teamName = modal.team.strTeam || "Team";

    return (
      <>
        <div className="grid gap-5 md:grid-cols-[8rem_1fr]">
          <img
            src={modal.team.strTeamBadge || buildFallbackImage(teamName)}
            alt={`${teamName} badge`}
            className="h-32 w-32 border-2 border-black bg-white object-contain"
          />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-600">Team Roster</p>
            <h2 id="detail-modal-title" className="mt-2 text-3xl font-black tracking-tight">{teamName}</h2>
            <p className="mt-1 text-sm font-bold text-slate-600 dark:text-zinc-400">{modal.team.strLeague || "League not listed"}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">{modal.team.strCountry || "Country not listed"}</p>
          </div>
        </div>

        {loading ? <p aria-live="polite" className="mt-5 font-semibold">Loading players…</p> : null}

        {!loading && teamPlayers.length ? (
          <ul
            className="mt-6 max-h-80 overflow-y-auto border border-slate-200 dark:border-zinc-700"
            aria-label={`${teamName} roster`}
          >
            {teamPlayers.map((player) => (
              <li key={player.idPlayer || player.strPlayer}>
                <button
                  type="button"
                  onClick={() => onOpenPlayer(player)}
                  className="
                    grid w-full grid-cols-[3.5rem_1fr] items-center gap-3
                    border-b border-slate-200 dark:border-zinc-700
                    bg-white dark:bg-zinc-900
                    p-3 text-left transition-colors
                    hover:bg-yellow-100 dark:hover:bg-zinc-800
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-inset
                  "
                  aria-label={`View profile for ${player.strPlayer || "player"}`}
                >
                  <img
                    src={player.strThumb || buildFallbackImage(player.strPlayer || "Player")}
                    alt={`${player.strPlayer || "Player"} photo`}
                    className="h-12 w-12 border border-black object-cover"
                  />
                  <div>
                    <p className="font-black">{player.strPlayer || "Player"}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">{player.strPosition || player.strSport || "Profile"}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && !teamPlayers.length ? (
          <p className="mt-5 font-semibold text-slate-500 dark:text-zinc-400">No roster was returned for this team.</p>
        ) : null}
      </>
    );
  };

  const renderLeague = () => {
    if (modal.type !== "league") return null;

    return (
      <>
        <div className="flex items-center gap-4">
          <div aria-hidden="true" className="flex h-16 w-16 items-center justify-center border-2 border-black bg-yellow-400 text-lg font-black">
            {modal.competition.label}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-600">Standings</p>
            <h2 id="detail-modal-title" className="text-3xl font-black tracking-tight">{modal.competition.name}</h2>
            <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">{modal.competition.season}</p>
          </div>
        </div>

        {loading ? <p aria-live="polite" className="mt-5 font-semibold">Loading standings…</p> : null}

        {!loading && leagueTable.length ? (
          <div className="mt-6 max-h-[65vh] overflow-y-auto border border-slate-200 dark:border-zinc-700">
            <table className="w-full border-collapse" aria-label={`${modal.competition.name} standings`}>
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                <tr className="border-b">
                  <th scope="col" className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400 text-left w-10">Pos</th>
                  <th scope="col" className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400 text-left">Team</th>
                  <th scope="col" className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400 text-left w-20">Played</th>
                  <th scope="col" className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400 text-left w-16">Pts</th>
                </tr>
              </thead>
              <tbody>
                {leagueTable.map((row) => (
                  <tr
                    key={`${row.intRank}-${row.strTeam}`}
                    className="border-b border-slate-100 dark:border-zinc-800 hover:bg-yellow-100 dark:hover:bg-zinc-800"
                  >
                    <td className="px-3 py-3 text-sm font-semibold">{row.intRank}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => row.strTeam && onOpenTeamByName(String(row.strTeam))}
                        className="text-sm font-black hover:text-yellow-700 dark:hover:text-yellow-400 focus-visible:outline-none focus-visible:underline"
                      >
                        {row.strTeam}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold">{row.intPlayed}</td>
                    <td className="px-3 py-3 text-sm font-black">{row.intPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !leagueTable.length ? (
          <p className="mt-5 font-semibold text-slate-500 dark:text-zinc-400">Standings were not returned for this season.</p>
        ) : null}
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={closeOnBackdrop}
    >
      <section
        ref={trapRef as React.RefObject<HTMLElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto border-4 border-black bg-white p-6 shadow-[10px_10px_0_0_rgba(250,204,21,1)] dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="mb-5 flex items-center justify-between">
          {/* sr-only heading fallback in case modal title hasn't loaded yet */}
          <span className="sr-only">{modalTitle}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details panel"
            className="
              ml-auto border-2 border-black bg-black px-3 py-2
              text-[10px] font-black uppercase tracking-[0.2em] text-white
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400
            "
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

// ─── Search Results Page ──────────────────────────────────────────────────────

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
    if (!query) return [];
    const normalized = normalizeCompetitionQuery(query);
    return competitions.filter((c) =>
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
            const norm = comparePlayerName.toLowerCase();
            const comparePlayer =
              nextPlayers.find((p) => p.strPlayer?.toLowerCase() === norm) ??
              nextPlayers.find((p) => p.strPlayer?.toLowerCase().includes(norm));
            if (comparePlayer?.idPlayer) {
              setSelectedComparePlayers((current) => {
                if (current.some((p) => p.idPlayer === comparePlayer.idPlayer)) return current;
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
    if (!selectedCompetition) { setCompetitionTable([]); return; }
    const fetchTable = async () => {
      setTableLoading(true);
      try {
        const table = await getExpandedLeagueTable(selectedCompetition.id, selectedCompetition.season, selectedCompetition.name);
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
      const token = localStorage.getItem("token");
      if (!token) { setFavoritePlayerIds([]); setFavoriteTeamIds([]); return; }
      try {
        const [playerRes, teamRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/favorites/players`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/favorites/teams`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const playerData = await playerRes.json();
        const teamData = await teamRes.json();
        if (!playerRes.ok || !teamRes.ok) {
          if (isAuthFailure(!playerRes.ok ? playerRes.status : teamRes.status, playerData.message || teamData.message)) {
            clearStoredAuth(); setFavoritePlayerIds([]); setFavoriteTeamIds([]);
            setFavoriteMessage("Your session expired. Log in again to save favorites.");
            return;
          }
          setFavoriteMessage(playerData.message || teamData.message || "Could not load favorites.");
          return;
        }
        setFavoritePlayerIds(
          Array.isArray(playerData.favorites) ? playerData.favorites.map((e: FavoritePlayerRecord) => e.externalId).filter(Boolean) : []
        );
        setFavoriteTeamIds(
          Array.isArray(teamData.favorites) ? teamData.favorites.map((e: FavoriteTeamRecord) => e.externalId).filter(Boolean) : []
        );
      } catch (err) {
        console.error("Favorite load failed:", err);
        setFavoriteMessage("Could not connect to backend favorites.");
      }
    };
    loadFavorites();
    window.addEventListener("auth-changed", loadFavorites);
    return () => window.removeEventListener("auth-changed", loadFavorites);
  }, []);

  const addPlayerToCompare = (player: PlayerResult) => {
    if (!player.idPlayer) return;
    setSelectedComparePlayers((current) => {
      if (current.some((p) => p.idPlayer === player.idPlayer) || current.length >= 2) return current;
      return [...current, player];
    });
  };

  const removePlayerFromCompare = (id: string) =>
    setSelectedComparePlayers((current) => current.filter((p) => p.idPlayer !== id));

  const clearComparePlayers = () => setSelectedComparePlayers([]);

  const openTeamDetailsByName = async (teamName: string) => {
    setDetailModal({ type: "team", team: { strTeam: teamName } });
    const teamResults = await searchTeam(teamName).catch(() => []);
    const matched = Array.isArray(teamResults)
      ? teamResults.find((t) => t.strTeam?.toLowerCase() === teamName.toLowerCase()) ?? teamResults[0]
      : null;
    if (matched) setDetailModal({ type: "team", team: matched });
  };

  const toggleFavoritePlayer = async (player: PlayerResult) => {
    const token = localStorage.getItem("token");
    if (!token) { setFavoriteMessage("Log in to save favorite players."); return; }
    if (!player.idPlayer) { setFavoriteMessage("This player result is missing an API id."); return; }
    const isSaved = favoritePlayerIds.includes(player.idPlayer);
    setFavoriteLoadingId(`player-${player.idPlayer}`);
    setFavoriteMessage("");
    try {
      const response = await fetch(
        isSaved ? `${API_BASE_URL}/api/favorites/players/${encodeURIComponent(player.idPlayer)}` : `${API_BASE_URL}/api/favorites/players`,
        {
          method: isSaved ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: isSaved ? undefined : JSON.stringify({ player }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        if (isAuthFailure(response.status, data.message)) {
          clearStoredAuth(); setFavoritePlayerIds([]); setFavoriteTeamIds([]);
          setFavoriteMessage("Your session expired. Log in again to save favorites.");
          return;
        }
        setFavoriteMessage(data.message || "Could not update favorite player.");
        return;
      }
      setFavoritePlayerIds((current) =>
        isSaved ? current.filter((id) => id !== player.idPlayer) : [...current, player.idPlayer!]
      );
      setFavoriteMessage(data.message || (isSaved ? "Favorite player removed." : "Favorite player saved."));
    } catch (err) {
      console.error("Favorite player update failed:", err);
      setFavoriteMessage("Could not connect to backend favorites.");
    } finally {
      setFavoriteLoadingId("");
    }
  };

  const toggleFavoriteTeam = async (team: TeamResult) => {
    const token = localStorage.getItem("token");
    if (!token) { setFavoriteMessage("Log in to save favorite teams."); return; }
    if (!team.idTeam) { setFavoriteMessage("This team result is missing an API id."); return; }
    const isSaved = favoriteTeamIds.includes(team.idTeam);
    setFavoriteLoadingId(`team-${team.idTeam}`);
    setFavoriteMessage("");
    try {
      const response = await fetch(
        isSaved ? `${API_BASE_URL}/api/favorites/teams/${encodeURIComponent(team.idTeam)}` : `${API_BASE_URL}/api/favorites/teams`,
        {
          method: isSaved ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: isSaved ? undefined : JSON.stringify({ team }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        if (isAuthFailure(response.status, data.message)) {
          clearStoredAuth(); setFavoritePlayerIds([]); setFavoriteTeamIds([]);
          setFavoriteMessage("Your session expired. Log in again to save favorites.");
          return;
        }
        setFavoriteMessage(data.message || "Could not update favorite team.");
        return;
      }
      setFavoriteTeamIds((current) =>
        isSaved ? current.filter((id) => id !== team.idTeam) : [...current, team.idTeam!]
      );
      setFavoriteMessage(data.message || (isSaved ? "Favorite team removed." : "Favorite team saved."));
    } catch (err) {
      console.error("Favorite team update failed:", err);
      setFavoriteMessage("Could not connect to backend favorites.");
    } finally {
      setFavoriteLoadingId("");
    }
  };

  const CARD_BTN = `
    mt-2 w-fit border-2 border-black bg-white px-3 py-1
    text-[10px] font-black uppercase tracking-[0.2em]
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1
    disabled:cursor-not-allowed disabled:opacity-50
    dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600
  `;

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-8 py-10">
      <section
        aria-labelledby="search-results-heading"
        className="border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_rgba(0,0,0,1)] dark:bg-zinc-900 dark:border-zinc-700"
      >
        <h1 id="search-results-heading" className="mb-2 text-3xl font-black tracking-tight">Global Search</h1>
        <p className="mb-6 text-sm font-semibold text-slate-600 dark:text-zinc-400">
          Search for players, teams, or competitions using the buttons below.
          {selectedComparePlayers.length === 1 ? " One player selected — search for another to compare." : ""}
        </p>

        <SearchBar
          initialValue={query}
          initialMode={mode}
          onSearch={handleSearch}
          placeholder="Try: Lionel Messi, English Premier League, or la liga"
        />

        <div className="mt-8 space-y-8">
          {/* Status messages */}
          {loading ? (
            <p aria-live="polite" role="status" className="font-semibold">Searching…</p>
          ) : null}
          {error ? (
            <p role="alert" aria-live="assertive" className="font-semibold text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          {favoriteMessage ? (
            <p role="status" aria-live="polite" className="font-semibold text-slate-600 dark:text-zinc-400">{favoriteMessage}</p>
          ) : null}

          {/* ── Players ── */}
          {mode === "players" && !loading ? (
            <section aria-labelledby="player-results-heading">
              <h2 id="player-results-heading" className="mb-4 text-xl font-black tracking-tight">
                Player Results for "{query}"
              </h2>
              {players.length ? (
                <ul className="grid gap-4 md:grid-cols-2" aria-label="Player search results">
                  {players.map((player) => (
                    <li key={player.idPlayer}>
                      <article
                        className="flex cursor-pointer gap-4 border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-black hover:bg-yellow-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        aria-label={`${player.strPlayer || "Player"}, ${player.strTeam || "club unknown"}, ${player.strPosition || ""}`}
                      >
                        {/* Clickable image/text area */}
                        <button
                          type="button"
                          className="contents focus-visible:outline-none"
                          aria-label={`View profile for ${player.strPlayer || "player"}`}
                          onClick={() => setDetailModal({ type: "player", player })}
                        >
                          <img
                            src={player.strThumb || buildFallbackImage(player.strPlayer || query || "PLAYER")}
                            alt={`${player.strPlayer ?? "Player"} photo`}
                            className="h-24 w-24 object-cover flex-shrink-0"
                          />
                        </button>
                        <div className="flex flex-1 flex-col justify-between">
                          <button
                            type="button"
                            onClick={() => setDetailModal({ type: "player", player })}
                            className="text-left focus-visible:outline-none focus-visible:underline"
                            aria-label={`View profile for ${player.strPlayer || "player"}`}
                          >
                            <h3 className="font-black">{player.strPlayer || query || "Player result"}</h3>
                            <p className="text-sm font-semibold">{player.strTeam || "Club not listed"}</p>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
                              {player.strPosition || player.strSport || "Profile"}
                            </p>
                          </button>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button
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
                              aria-pressed={selectedComparePlayers.some((s) => s.idPlayer === player.idPlayer)}
                              className="
                                border-2 border-black bg-yellow-300 px-3 py-1
                                text-[10px] font-black uppercase tracking-[0.2em]
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1
                                disabled:cursor-not-allowed disabled:opacity-50 dark:text-black
                              "
                            >
                              {selectedComparePlayers.some((s) => s.idPlayer === player.idPlayer) ? "Selected" : "Add to Compare"}
                            </button>
                            <button
                              onClick={() => toggleFavoritePlayer(player)}
                              disabled={!player.idPlayer || favoriteLoadingId === `player-${player.idPlayer}`}
                              aria-label={
                                favoritePlayerIds.includes(player.idPlayer ?? "")
                                  ? `Remove ${player.strPlayer} from favorites`
                                  : `Save ${player.strPlayer} to favorites`
                              }
                              aria-pressed={favoritePlayerIds.includes(player.idPlayer ?? "")}
                              className={CARD_BTN}
                            >
                              {favoriteLoadingId === `player-${player.idPlayer}`
                                ? "Saving…"
                                : favoritePlayerIds.includes(player.idPlayer ?? "")
                                  ? "Remove Favorite"
                                  : "Save Favorite"}
                            </button>
                          </div>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-semibold text-slate-500 dark:text-zinc-400">No players found for this search.</p>
              )}

              <div className="mt-6">
                <PlayerComparisonPanel
                  selectedPlayers={selectedComparePlayers}
                  onRemovePlayer={removePlayerFromCompare}
                  onResetComparison={clearComparePlayers}
                />
              </div>
            </section>
          ) : null}

          {/* ── Teams ── */}
          {mode === "teams" && !loading ? (
            <section aria-labelledby="team-results-heading">
              <h2 id="team-results-heading" className="mb-4 text-xl font-black tracking-tight">
                Team Results for "{query}"
              </h2>
              {teams.length ? (
                <div className="max-h-[36rem] overflow-y-auto pr-2">
                  <ul className="grid gap-4 md:grid-cols-2" aria-label="Team search results">
                    {teams.map((team) => (
                      <li key={team.idTeam}>
                        <article
                          className="flex gap-4 border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-zinc-700 dark:bg-zinc-800"
                          aria-label={`${team.strTeam || "Team"}, ${team.strLeague || ""}, ${team.strCountry || ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => setDetailModal({ type: "team", team })}
                            className="focus-visible:outline-none"
                            aria-label={`View ${team.strTeam} roster`}
                          >
                            <img
                              src={team.strTeamBadge || buildFallbackImage(team.strTeam || query || "TEAM")}
                              alt={`${team.strTeam ?? "Team"} badge`}
                              className="h-20 w-20 object-contain bg-white cursor-pointer"
                            />
                          </button>
                          <div>
                            <button
                              type="button"
                              onClick={() => setDetailModal({ type: "team", team })}
                              className="text-left focus-visible:outline-none focus-visible:underline"
                            >
                              <h3 className="font-black">{team.strTeam || query || "Team result"}</h3>
                              <p className="text-sm font-semibold">{team.strLeague || "League not listed"}</p>
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">{team.strCountry || "Club"}</p>
                            </button>
                            <button
                              onClick={() => toggleFavoriteTeam(team)}
                              disabled={!team.idTeam || favoriteLoadingId === `team-${team.idTeam}`}
                              aria-label={
                                favoriteTeamIds.includes(team.idTeam ?? "")
                                  ? `Remove ${team.strTeam} from favorites`
                                  : `Save ${team.strTeam} to favorites`
                              }
                              aria-pressed={favoriteTeamIds.includes(team.idTeam ?? "")}
                              className={CARD_BTN}
                            >
                              {favoriteLoadingId === `team-${team.idTeam}`
                                ? "Saving…"
                                : favoriteTeamIds.includes(team.idTeam ?? "")
                                  ? "Remove Favorite"
                                  : "Save Favorite"}
                            </button>
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
          ) : null}

          {/* ── Competitions ── */}
          {mode === "competitions" && !loading ? (
            <div className="space-y-6">
              <section aria-labelledby="competition-results-heading">
                <h2 id="competition-results-heading" className="mb-4 text-xl font-black tracking-tight">
                  Competition Results for "{query}"
                </h2>
                {matchingCompetitions.length ? (
                  <ul className="grid gap-4 md:grid-cols-2" aria-label="Competition search results">
                    {matchingCompetitions.map((competition) => (
                      <li key={competition.id}>
                        <button
                          onClick={() => {
                            setSelectedCompetition(competition);
                            setDetailModal({ type: "league", competition });
                          }}
                          aria-pressed={selectedCompetition?.id === competition.id}
                          aria-label={`View ${competition.name} standings`}
                          className={`
                            flex w-full items-center gap-4 border-2 p-4 text-left transition-all
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1
                            ${selectedCompetition?.id === competition.id
                              ? "border-black bg-yellow-100 dark:bg-zinc-700"
                              : "border-slate-200 bg-slate-50 hover:border-black dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500"
                            }
                          `}
                        >
                          <div aria-hidden="true" className="flex h-16 w-16 flex-shrink-0 items-center justify-center border-2 border-black bg-yellow-400 text-lg font-black text-black">
                            {competition.label}
                          </div>
                          <div>
                            <h3 className="font-black">{competition.name}</h3>
                            <p className="text-sm font-semibold">{competition.country}</p>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">Click to view standings</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-semibold text-slate-500 dark:text-zinc-400">
                    No competitions found. Try names like la liga, premier league, bundesliga, or serie a.
                  </p>
                )}
              </section>

              {selectedCompetition ? (
                <section aria-labelledby="standings-heading" className="border border-slate-200 bg-slate-50 p-6 dark:border-zinc-700 dark:bg-zinc-800">
                  <h2 id="standings-heading" className="mb-4 text-2xl font-black tracking-tight">
                    {selectedCompetition.name} Table
                  </h2>
                  {tableLoading ? (
                    <p aria-live="polite" className="font-semibold">Loading league table…</p>
                  ) : competitionTable.length ? (
                    <div className="max-h-[70vh] overflow-y-auto border border-slate-200 dark:border-zinc-700">
                      <table className="w-full border-collapse" aria-label={`${selectedCompetition.name} standings`}>
                        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-zinc-800">
                          <tr className="border-b border-slate-200 dark:border-zinc-700">
                            <th scope="col" className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400 text-left w-10">Pos</th>
                            <th scope="col" className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400 text-left">Team</th>
                            <th scope="col" className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400 text-left w-20">Played</th>
                            <th scope="col" className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400 text-left w-16">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competitionTable.map((row) => (
                            <tr
                              key={`${row.intRank}-${row.strTeam}`}
                              className="border-b border-slate-100 dark:border-zinc-700 text-sm font-semibold"
                            >
                              <td className="px-3 py-3">{row.intRank}</td>
                              <td className="px-3 py-3">
                                <button
                                  type="button"
                                  onClick={() => row.strTeam && openTeamDetailsByName(String(row.strTeam))}
                                  className="font-black hover:text-yellow-700 dark:hover:text-yellow-400 focus-visible:outline-none focus-visible:underline"
                                  aria-label={`View ${row.strTeam} team details`}
                                >
                                  {row.strTeam}
                                </button>
                              </td>
                              <td className="px-3 py-3">{row.intPlayed}</td>
                              <td className="px-3 py-3 font-black">{row.intPoints}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-black">Standings were not returned for the selected season.</p>
                      <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">
                        {selectedCompetition.country} | {selectedCompetition.season} | {selectedCompetition.label}
                      </p>
                    </div>
                  )}
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <DetailsModal
        modal={detailModal}
        onClose={() => setDetailModal(null)}
        onOpenPlayer={(player) => setDetailModal({ type: "player", player })}
        onOpenTeamByName={openTeamDetailsByName}
      />
    </main>
  );
}

export default SearchResultsPage;