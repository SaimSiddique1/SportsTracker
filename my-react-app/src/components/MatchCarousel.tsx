import { useEffect, useRef, useState } from "react"
import { getRecentLeagueMatches } from "../sportsdbaAPI"

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

function MatchCarousel() {
  const [matches, setMatches] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      const data = await getRecentLeagueMatches('4328');
      setMatches(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    fetchSchedules();
  }, [])

  const scrollBy = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "right" ? 300 : -300,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <div
        aria-live="polite"
        aria-label="Loading match schedule"
        className="p-6 text-center text-sm font-semibold animate-pulse text-slate-500 dark:text-zinc-500"
      >
        Loading schedule…
      </div>
    );
  }

  if (!matches.length) {
    return (
      <div
        aria-live="polite"
        className="p-6 text-center text-sm font-semibold text-slate-500 dark:text-zinc-500"
      >
        No recent match data is available right now.
      </div>
    );
  }

  return (
    <section aria-label="Recent Premier League matches">
      <div className="relative">
        {/* Scroll left */}
        <button
          type="button"
          aria-label="Scroll matches left"
          onClick={() => scrollBy("left")}
          className="
            absolute left-2 top-1/2 z-10 -translate-y-1/2
            flex h-8 w-8 items-center justify-center
            border-2 border-black bg-white text-black
            shadow-[2px_2px_0_0_rgba(0,0,0,1)]
            transition-colors hover:bg-yellow-400
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400
            dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-700
          "
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div
          ref={scrollRef}
          role="list"
          aria-label="Match results"
          className="
            flex gap-4 overflow-x-auto scroll-smooth px-12 py-6
            bg-white dark:bg-zinc-950/50
            border-b border-slate-200 dark:border-zinc-900
            select-none
            /* hide scrollbar visually but keep it accessible */
            [&::-webkit-scrollbar]:h-1
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-slate-300
            dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700
          "
        >
          {matches.map((item) => (
            <article
              key={item.idEvent}
              role="listitem"
              aria-label={`${item.strHomeTeam} vs ${item.strAwayTeam}, ${item.intHomeScore ?? 0}–${item.intAwayScore ?? 0}, ${item.dateEvent}`}
              className="
                min-w-[16rem] flex-shrink-0
                bg-slate-100 dark:bg-zinc-900
                p-4 border-l-4 border-yellow-500
                hover:bg-slate-200 dark:hover:bg-zinc-800
                focus-within:outline-2 focus-within:outline-yellow-400
                transition-all
              "
            >
              {/* Date / time row */}
              <div className="flex justify-between text-[10px] font-black tracking-widest mb-3 opacity-60">
                <time dateTime={item.dateEvent}>{item.dateEvent}</time>
                <span className="text-yellow-500">{item.strTime}</span>
              </div>

              {/* Teams + score row */}
              <div className="flex items-center justify-between gap-2">
                {/* Home team */}
                <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div className="h-10 w-10 bg-slate-200 dark:bg-zinc-800 border-2 border-black overflow-hidden flex items-center justify-center flex-shrink-0">
                    {item.strThumb ? (
                      <img src={item.strThumb} alt="" aria-hidden="true" className="object-cover w-full h-full" />
                    ) : (
                      <span aria-hidden="true" className="text-[9px] font-black">{item.strHomeTeam.substring(0, 3).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-black tracking-tighter text-center w-full truncate">{item.strHomeTeam}</span>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <span
                    aria-label={`Score: ${item.intHomeScore ?? 0} to ${item.intAwayScore ?? 0}`}
                    className="bg-white dark:bg-black px-3 py-1 text-base font-black border border-slate-200 dark:border-zinc-800 tabular-nums"
                  >
                    {item.intHomeScore ?? '0'} – {item.intAwayScore ?? '0'}
                  </span>
                </div>

                {/* Away team */}
                <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div className="h-10 w-10 bg-slate-200 dark:bg-zinc-800 border-2 border-black overflow-hidden flex items-center justify-center flex-shrink-0">
                    {item.strThumb ? (
                      <img src={item.strThumb} alt="" aria-hidden="true" className="object-cover w-full h-full" />
                    ) : (
                      <span aria-hidden="true" className="text-[9px] font-black">{item.strAwayTeam.substring(0, 3).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-black tracking-tighter text-center w-full truncate">{item.strAwayTeam}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Scroll right */}
        <button
          type="button"
          aria-label="Scroll matches right"
          onClick={() => scrollBy("right")}
          className="
            absolute right-2 top-1/2 z-10 -translate-y-1/2
            flex h-8 w-8 items-center justify-center
            border-2 border-black bg-white text-black
            shadow-[2px_2px_0_0_rgba(0,0,0,1)]
            transition-colors hover:bg-yellow-400
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400
            dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-700
          "
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}

export default MatchCarousel