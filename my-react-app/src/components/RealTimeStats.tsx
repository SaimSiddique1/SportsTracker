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
      <p
        role="status"
        aria-live="polite"
        aria-label="Loading recent matches"
        className="text-sm font-semibold text-slate-500 dark:text-zinc-400 animate-pulse"
      >
        Loading recent matches…
      </p>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  }

  return (
    <section aria-labelledby="recent-matches-heading" className="space-y-3">
      <h3
        id="recent-matches-heading"
        className="text-lg font-black tracking-tight dark:text-zinc-100"
      >
        Recent Premier League Matches
      </h3>

      <ul role="list" className="space-y-3">
        {matches.map((match) => {
          const homeScore = match.intHomeScore ?? "-";
          const awayScore = match.intAwayScore ?? "-";
          const scoreLabel = `${match.strHomeTeam} ${homeScore} – ${awayScore} ${match.strAwayTeam}`;

          return (
            <li key={match.idEvent}>
              <article
                aria-label={scoreLabel}
                className="
                  border border-slate-200 bg-slate-50 px-4 py-3 text-sm
                  dark:border-zinc-700 dark:bg-zinc-800
                "
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold dark:text-zinc-100">{match.strHomeTeam}</span>
                  <span
                    className="font-black dark:text-zinc-100"
                    aria-hidden="true" /* score is in the article aria-label */
                  >
                    {homeScore} : {awayScore}
                  </span>
                  <span className="text-right font-bold dark:text-zinc-100">{match.strAwayTeam}</span>
                </div>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
                  <time dateTime={match.dateEvent}>{match.dateEvent ?? "Date unavailable"}</time>
                </p>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}