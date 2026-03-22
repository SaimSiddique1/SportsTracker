function MatchCarousel() {
    const matches = [
        {id: 1, home: "HME", away: "AWY", score: "#-#", state: "Live ##'", league: "LGE"},
        {id: 2, home: "HME", away: "AWY", score: "#-#", state: "23:00", league: "LGE"},
        {id: 3, home: "HME", away: "AWY", score: "#-#", state: "TBD", league: "LGE"},
        {id: 4, home: "HME", away: "AWY", score: "#-#", state: "TBD", league: "LGE"},
        {id: 5, home: "HME", away: "AWY", score: "#-#", state: "TBD", league: "LGE"},
    ]

    return (
        <div className="flex gap-4 p-6 overflow-x-auto bg-white dark:bg-zinc-950/50 border-b border-slate-200 dark:border-zinc-900 select-none">
            {matches.map((match) => (
                <div key={match.id} className="min-w-55 bg-slate-100 dark:bg-zinc-900 p-4 border-l-4 border-yellow-500 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                    <div className="flex justify-between text-[10px] font-black tracking-widest mb-3 opacity-60">
                        <span>{match.league}</span>
                        <span className={match.state.includes('Live') ? "text-red-500 animate-pulse" : ""}>{match.state}</span>
                    </div>
                    <div className="flex justify-between items-center font-black text-lg">
                        <span>{match.home}</span>
                        <span className="bg-white dark:bg-black px-3 py-1 text-xs border border-slate-200 dark:border-zinc-800">{match.score}</span>
                        <span>{match.away}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default MatchCarousel