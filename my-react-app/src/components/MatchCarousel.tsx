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
}

function MatchCarousel() {
    const [matches, setMatches] = useState<Fixture[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSchedules = async() => {
            try {
                setLoading(true);
                const data = await getRecentLeagueMatches('4328');
                if(data) setMatches(data);
            } catch(err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to load data.");
            } finally {
                setLoading(false);
            }
        }
        fetchSchedules();
    }, [])

    if(loading) return <div className="p-10 text-center animate-pulse text-slate-500">Loading Schedule...</div>
    if(error) return <div className="p-10 text-center text-red-500">Error: {error}</div>

    return (
        <div className="flex gap-4 p-6 overflow-x-auto bg-white dark:bg-zinc-950/50 border-b border-slate-200 dark:border-zinc-900 select-none">
            {matches.map((item) => (
                <div key={item.idEvent} className="min-w-70 bg-slate-100 dark:bg-zinc-900 p-4 border-l-4 border-yellow-500 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                    <div className="flex justify-between text-[10px] font-black tracking-widest mb-3 opacity-60">
                        <span>{item.dateEvent}</span>
                        <span className="text-yellow-500">{item.strTime}</span>
                    </div>

                    <div className="flex justify-between items-center font-black">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-2 border-2 border-black overflow-hidden">
                            {item.strThumb ? (<img src={item.strThumb} alt="" className="object-cover w-full h-full"/>) : (<span className="text-[10px]">{item.strHomeTeam.substring(0,3)}</span>)}
                            <span className="text-xs truncate w-full text-center tracking-tighter">{item.strHomeTeam}</span>
                        </div>

                        <div className="flex flex-col items-center">
                            <span className="bg-white dark:bg-black px-4 py-1 text-lg border border-slate-200 dark:border-zinc-800">
                                {item.intHomeScore ?? '0'} - {item.intAwayScore ?? '0'}
                            </span>
                        </div>

                        <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-2 border-2 border-black overflow-hidden">
                            {item.strThumb ? (<img src={item.strThumb} alt="" className="object-cover w-full h-full"/>) : (<span className="text-[10px]">{item.strAwayTeam.substring(0,3)}</span>)}
                            <span className="text-xs truncate w-full text-center tracking-tighter">{item.strAwayTeam}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default MatchCarousel
