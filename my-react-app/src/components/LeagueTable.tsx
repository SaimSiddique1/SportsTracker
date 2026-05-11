import { useEffect, useState } from "react";
import { getExpandedLeagueTable } from "../sportsdbaAPI";

type LeagueOption = {
  id: string;
  name: string;
  season: string;
  label: string;
};

type StandingRow = {
  intRank?: string | number;
  strTeam?: string;
  intPlayed?: string | number;
  intPoints?: string | number;
  isRosterOnly?: boolean;
};

const leagues: LeagueOption[] = [
  { id: "4328", name: "English Premier League", season: "2024-2025", label: "PL" },
  { id: "4335", name: "Spanish La Liga", season: "2024-2025", label: "LL" },
  { id: "4331", name: "German Bundesliga", season: "2024-2025", label: "BL" },
];

function LeagueTable() {
  const [currLeague, setCurrLeague] = useState(leagues[0]);
  const [teams, setTeams] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeagueTable = async () => {
      setLoading(true);
      setError("");
      try {
        const table = await getExpandedLeagueTable(currLeague.id, currLeague.season, currLeague.name);
        setTeams(Array.isArray(table) ? table : []);
      } catch (err) {
        console.error("League table error:", err);
        setTeams([]);
        setError("Could not load live standings.");
      } finally {
        setLoading(false);
      }
    };
    fetchLeagueTable();
  }, [currLeague]);

  const tableId = `league-table-${currLeague.id}`;

  return (
    <div className="space-y-6">
      {/* League selector */}
      <div
        role="tablist"
        aria-label="Select league"
        className="flex flex-wrap gap-2 border-b-2 border-slate-100 pb-4 dark:border-zinc-800"
      >
        {leagues.map((league) => (
          <button
            key={league.id}
            role="tab"
            aria-selected={currLeague.id === league.id}
            aria-controls={tableId}
            onClick={() => setCurrLeague(league)}
            className={`
              px-3 py-1 text-[10px] font-black tracking-tighter transition-all border-2
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-1
              ${currLeague.id === league.id
                ? "bg-yellow-400 border-black text-black"
                : "bg-transparent border-transparent opacity-50 hover:opacity-100 dark:text-zinc-100"
              }
            `}
          >
            {league.label}
            <span className="sr-only"> — {league.name}</span>
          </button>
        ))}
      </div>

      {/* Table area */}
      <div
        id={tableId}
        role="tabpanel"
        aria-label={`${currLeague.name} standings`}
        className="max-h-[32rem] overflow-y-auto border border-slate-100 dark:border-zinc-800"
        tabIndex={0}
      >
        {loading ? (
          <p aria-live="polite" className="px-2 py-3 text-sm font-semibold">
            Loading {currLeague.name} standings…
          </p>
        ) : error ? (
          <p aria-live="assertive" role="alert" className="px-2 py-3 text-sm font-semibold text-red-600">
            {error}
          </p>
        ) : (
          <table className="w-full border-collapse" aria-label={`${currLeague.name} ${currLeague.season} standings`}>
            <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
              <tr className="border-b border-slate-100 dark:border-zinc-800">
                <th scope="col" className="w-6 px-2 py-2 text-[10px] font-black text-left opacity-60">#</th>
                <th scope="col" className="px-2 py-2 text-[10px] font-black text-left opacity-60">Team</th>
                <th scope="col" className="w-16 px-2 py-2 text-[10px] font-black text-left opacity-60">Played</th>
                <th scope="col" className="w-14 px-2 py-2 text-[10px] font-black text-left opacity-60">Pts</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr
                  key={`${team.intRank}-${team.strTeam}`}
                  className="
                    border-b border-slate-100 dark:border-zinc-800
                    text-sm font-bold transition-colors
                    hover:bg-yellow-400 hover:text-black dark:hover:text-black
                    focus-within:bg-yellow-400 focus-within:text-black
                  "
                >
                  <td className="px-2 py-3 text-yellow-600 font-black">{team.intRank}</td>
                  <td className="px-2 py-3 truncate max-w-[8rem]">{team.strTeam}</td>
                  <td className="px-2 py-3 opacity-60">{team.intPlayed}</td>
                  <td className="px-2 py-3 font-black">{team.intPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* League name footer */}
      <button
        type="button"
        aria-label={`Currently viewing ${currLeague.name}`}
        className="
          w-full bg-slate-100 py-3 text-[10px] font-black tracking-[0.2em]
          transition-all
          hover:bg-black hover:text-white
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1
          dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-white dark:hover:text-black
        "
      >
        {currLeague.name}
      </button>
    </div>
  );
}

export default LeagueTable;