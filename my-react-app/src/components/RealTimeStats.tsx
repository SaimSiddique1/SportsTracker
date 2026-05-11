import { useEffect, useState } from "react";
import { getRecentLeagueMatches } from "../sportsdbaAPI";

type MatchRow = {
  idEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  dateEvent?: string;
};

export default function RealTimeStats() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const data = await getRecentLeagueMatches("4328");
        setMatches(Array.isArray(data) ? data.slice(0, 4) : []);
      } catch (err) {
        console.error("Recent match fetch failed:", err);
        setError("Could not load recent match stats.");
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  if (loading) {
    return (
      <p aria-live="polite" className="text-sm font-semibold text-slate-500 dark:text-zinc-500">
        Loading recent matches…
      </p>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-sm font-semibold text-red-600">
        {error}
      </p>
    );
  }

  return (
    <section aria-labelledby="recent-matches-heading" className="space-y-3">
      <h3 id="recent-matches-heading" className="text-lg font-black tracking-tight">
        Recent Premier League Matches
      </h3>
      <ol aria-label="Recent match results" className="space-y-3">
        {matches.map((match) => (
          <li
            key={match.idEvent}
            className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div
              className="flex items-center justify-between gap-4"
              aria-label={`${match.strHomeTeam} ${match.intHomeScore ?? "–"} : ${match.intAwayScore ?? "–"} ${match.strAwayTeam}`}
            >
              <span className="font-bold">{match.strHomeTeam}</span>
              <span className="font-black tabular-nums" aria-hidden="true">
                {match.intHomeScore ?? "–"} : {match.intAwayScore ?? "–"}
              </span>
              <span className="font-bold text-right">{match.strAwayTeam}</span>
            </div>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
              {match.dateEvent ? (
                <time dateTime={match.dateEvent}>{match.dateEvent}</time>
              ) : (
                "Date unavailable"
              )}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}