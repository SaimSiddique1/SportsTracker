import { useEffect, useState } from "react"
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
    leagueName?: string;
}

const featuredLeagues = [
    { id: "4328", name: "Premier League" },
    { id: "4335", name: "La Liga" },
    { id: "4331", name: "Bundesliga" },
    { id: "4332", name: "Serie A" },
    { id: "4334", name: "Ligue 1" },
];

function MatchCarousel() {
    const [matches, setMatches] = useState<Fixture[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSchedules = async() => {
            try {
                setLoading(true);
                const leagueResults = await Promise.all(
                    featuredLeagues.map(async (league) => {
                        const data = await getRecentLeagueMatches(league.id);
                        return (Array.isArray(data) ? data : [])
                            .slice(0, 3)
                            .map((match) => ({ ...match, leagueName: league.name }));
                    })
                );

                setMatches(leagueResults.flat());
            } catch(err:any) {
                setError(err.message || "Failed to load data.");
            } finally {
                setLoading(false);
            }
        }
        fetchSchedules();
    }, [])

    if(loading) return <div className="p-10 text-center animate-pulse text-slate-500">Loading Schedule...</div>
    if(error) return <div className="p-10 text-center text-red-500">Error: {error}</div>

    return (
        <section className="bg-white dark:bg-zinc-950/50 border-b border-slate-200 dark:border-zinc-900 select-none">
            <div className="flex items-center gap-5 p-6">
                <h2 className="shrink-0 text-sm font-black uppercase tracking-[0.25em] text-slate-700 dark:text-zinc-200">
                    Live Matches:
                </h2>

                <div className="flex flex-1 gap-4 overflow-x-auto pb-2">
                    {matches.map((item) => (
                        <div key={`${item.leagueName}-${item.idEvent}`} className="min-w-[20rem] bg-slate-100 dark:bg-zinc-900 p-4 border-l-4 border-yellow-500 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                            <div className="flex justify-between gap-3 text-[9px] font-black tracking-widest mb-3 opacity-60">
                                <span>{item.dateEvent}</span>
                                <span className="text-yellow-500">{item.strTime}</span>
                            </div>

                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 font-black">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-11 h-11 bg-slate-100 dark:bg-zinc-800 flex shrink-0 items-center justify-center border-2 border-black overflow-hidden">
                                        {item.strThumb ? (<img src={item.strThumb} alt="" className="object-cover w-full h-full"/>) : (<span className="text-[10px]">{item.strHomeTeam.substring(0,3)}</span>)}
                                    </div>
                                    <span className="truncate text-xs tracking-tighter">{item.strHomeTeam}</span>
                                </div>

                                <span className="bg-white dark:bg-black px-3 py-1 text-sm border border-slate-200 dark:border-zinc-800">
                                    {item.intHomeScore ?? '0'} - {item.intAwayScore ?? '0'}
                                </span>

                                <div className="flex min-w-0 items-center justify-end gap-2">
                                    <span className="truncate text-right text-xs tracking-tighter">{item.strAwayTeam}</span>
                                    <div className="w-11 h-11 bg-slate-100 dark:bg-zinc-800 flex shrink-0 items-center justify-center border-2 border-black overflow-hidden">
                                        {item.strThumb ? (<img src={item.strThumb} alt="" className="object-cover w-full h-full"/>) : (<span className="text-[10px]">{item.strAwayTeam.substring(0,3)}</span>)}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 bg-white/70 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.25em] dark:bg-black/40">
                                {item.leagueName}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default MatchCarousel
