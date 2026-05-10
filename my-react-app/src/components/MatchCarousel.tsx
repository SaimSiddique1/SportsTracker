import { useEffect, useRef, useState } from "react";
import { getRecentLeagueMatches } from "../sportsdbaAPI";

interface Fixture {
  idEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  dateEvent: string;
  strTime: string;
  strThumb?: string;
}

// Small team badge / fallback
function TeamBadge({ name, thumb }: { name: string; thumb?: string }) {
  const abbr = name.substring(0, 3).toUpperCase();
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="h-12 w-12 overflow-hidden border-2 border-black bg-slate-100 dark:bg-zinc-800 flex items-center justify-center"
        aria-hidden="true"
      >
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] font-black">{abbr}</span>
        )}
      </div>
      <span className="w-16 truncate text-center text-xs font-black tracking-tighter dark:text-zinc-100">
        {name}
      </span>
    </div>
  );
}

function MatchCarousel() {
  const [matches, setMatches] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For keyboard scrolling
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const data = await getRecentLeagueMatches("4328");
        if (data) setMatches(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading match schedule"
        className="p-10 text-center text-slate-500 animate-pulse dark:text-zinc-400"
      >
        Loading Schedule…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="p-10 text-center text-red-500 dark:text-red-400">
        Error: {error}
      </div>
    );
  }

  return (
    <section aria-label="Recent Premier League matches">
      {/* Scrollable match list */}
      <ul
        ref={listRef}
        role="list"
        tabIndex={0}
        aria-label="Match results carousel — use arrow keys to scroll"
        onKeyDown={(e) => {
          if (!listRef.current) return;
          if (e.key === "ArrowRight") listRef.current.scrollBy({ left: 300, behavior: "smooth" });
          if (e.key === "ArrowLeft")  listRef.current.scrollBy({ left: -300, behavior: "smooth" });
        }}
        className="
          flex gap-4 overflow-x-auto p-6 select-none
          border-b border-slate-200 bg-white
          dark:border-zinc-900 dark:bg-zinc-950/50
          focus-visible:outline focus-visible:outline-yellow-400
          focus-visible:outline-offset-2
        "
      >
        {matches.map((item) => {
          const hasScore = item.intHomeScore !== null && item.intAwayScore !== null;
          const scoreLabel = hasScore
            ? `${item.intHomeScore} – ${item.intAwayScore}`
            : "Score not available";

          return (
            <li
              key={item.idEvent}
              className="
                min-w-70 shrink-0 cursor-pointer border-l-4 border-yellow-500
                bg-slate-100 p-4 transition-all
                hover:bg-slate-200
                dark:bg-zinc-900 dark:hover:bg-zinc-800
              "
              // Make each card focusable so keyboard users can read them
              tabIndex={0}
              role="article"
              aria-label={`${item.strHomeTeam} vs ${item.strAwayTeam}, ${scoreLabel}, ${item.dateEvent}`}
            >
              {/* Date / time row */}
              <div className="mb-3 flex justify-between text-[10px] font-black tracking-widest opacity-60 dark:text-zinc-300">
                <time dateTime={item.dateEvent}>{item.dateEvent}</time>
                <span className="text-yellow-500 dark:text-yellow-400">{item.strTime}</span>
              </div>

              {/* Teams + score */}
              <div className="flex items-center justify-between font-black">
                <TeamBadge name={item.strHomeTeam} thumb={item.strThumb} />

                <div
                  className="
                    flex flex-col items-center gap-1
                    bg-white px-4 py-1 text-lg
                    border border-slate-200
                    dark:bg-black dark:border-zinc-800 dark:text-zinc-100
                  "
                  aria-hidden="true" /* full score is in the li aria-label */
                >
                  {item.intHomeScore ?? "0"} – {item.intAwayScore ?? "0"}
                </div>

                <TeamBadge name={item.strAwayTeam} thumb={item.strThumb} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default MatchCarousel;