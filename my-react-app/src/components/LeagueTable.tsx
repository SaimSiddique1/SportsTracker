import { useEffect, useState } from "react";
import { getLeagueTable as getSportsDbLeagueTable } from "../sportsdbaAPI";

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
        const table = await getSportsDbLeagueTable(currLeague.id, currLeague.season);
        setTeams(Array.isArray(table) ? table.slice(0, 5) : []);
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

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Select league" className="flex flex-wrap gap-2 border-b-2 border-slate-200 pb-4 dark:border-zinc-700">
        {leagues.map((league) => {
          const active = currLeague.id === league.id;
          return (
            <button
              key={league.id}
              type="button"
              onClick={() => setCurrLeague(league)}
              aria-pressed={active}
              aria-label={league.name}
              className={`border-2 px-3 py-1 text-[10px] font-black tracking-tighter transition-all focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400 ${
                active
                  ? "bg-yellow-400 border-black text-black dark:border-y-amber-400"
                  : "bg-transparent border-transparent opacity-50 hover:opacity-100 text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {league.label}
            </button>
          )
        })}
      </div>

      <div role="region" aria-label={`${currLeague.name} standings`} aria-live="polite" aria-busy={loading}>
        <div aria-hidden="true" className="grid grid-cols-6 px-2 text-[10px] font-black text-slate-400 dark:text-zinc-500">
          <span className="col-span-3">Team</span>
          <span>Played</span>
          <span>Points</span>
        </div>

        {loading ? (
          <p className="px-2 text-sm font-semibold text-slate-500 dark:text-zinc-400">Loading standings...</p>
        ) : error ? (
          <p role="alert" className="px-2 text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <table className="w-full border-collapse">
            <caption className="sr-only">{currLeague.name} top 5 standings</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Team</th>
                <th scope="col">Played</th>
                <th scope="col">Points</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr
                  key={`${team.intRank}-${team.strTeam}`}
                  className="grid grid-cols-6 items-center border-b border-slate-100 px-2 py-3 text-sm font-bold transition-colors cursor-default dark:border-zinc-700 hover:bg-yellow-400 dark:hover:text-black dark:text-zinc-100 dark:hover:bg-yellow-400 hover:text-black"
                >
                  <td className="col-span-3 flex gap-2">
                    <span className="text-yellow-600 dark:text-yellow-400">{team.intRank}</span>
                    <span className="truncate">{team.strTeam}</span>
                  </td>
                  <td className="opacity-60">{team.intPlayed}</td>
                  <td className="font-black">{team.intPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="w-full bg-slate-100 py-3 text-center text-[10px] font-black tracking-[0.2em] text-slate-600 transition-all dark:bg-zinc-800 dark:text-zinc-400">
        {currLeague.name}
      </p>
    </div>
  );
}

export default LeagueTable;
