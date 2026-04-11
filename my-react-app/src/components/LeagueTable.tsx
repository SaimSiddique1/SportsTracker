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
      <div className="flex flex-wrap gap-2 border-b-2 border-slate-100 pb-4 dark:border-zinc-800">
        {leagues.map((league) => (
          <button
            key={league.id}
            onClick={() => setCurrLeague(league)}
            className={`px-3 py-1 text-[10px] font-black tracking-tighter transition-all border-2 ${
              currLeague.id === league.id
                ? "bg-yellow-400 border-black text-black"
                : "bg-transparent border-transparent opacity-50 hover:opacity-100"
            }`}
          >
            {league.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-6 px-2 text-[10px] font-black opacity-40">
          <span className="col-span-3 font-black">Team</span>
          <span>Played</span>
          <span>Points</span>
        </div>

        {loading ? (
          <p className="px-2 text-sm font-semibold">Loading standings...</p>
        ) : error ? (
          <p className="px-2 text-sm font-semibold text-red-600">{error}</p>
        ) : (
          teams.map((team) => (
            <div
              key={`${team.intRank}-${team.strTeam}`}
              className="grid grid-cols-6 items-center px-2 py-3 text-sm font-bold transition-colors border-b border-slate-100 cursor-pointer dark:border-zinc-800 hover:bg-yellow-400 dark:hover:text-black"
            >
              <div className="col-span-3 flex gap-2">
                <span className="text-yellow-600">{team.intRank}</span>
                <span className="truncate">{team.strTeam}</span>
              </div>
              <span className="opacity-60">{team.intPlayed}</span>
              <span className="font-black">{team.intPoints}</span>
            </div>
          ))
        )}
      </div>

      <button className="w-full bg-slate-100 py-3 text-[10px] font-black tracking-[0.2em] transition-all dark:bg-zinc-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black">
        {currLeague.name}
      </button>
    </div>
  );
}

export default LeagueTable;
