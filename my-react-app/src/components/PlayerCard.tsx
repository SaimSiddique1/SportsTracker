interface PlayerInfo {
    name: string;
    team: string;
    goals: number;
    assists: number;
    imageUrl: string;
    onCompare?: () => void;
}

function PlayerCard({name, team, goals, assists, imageUrl, onCompare} : PlayerInfo) {
    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 transition-all">
            <div className="grid grid-cols-[8rem_1fr] gap-4 p-6">
                <img
                    src={imageUrl}
                    alt={name}
                    className="h-32 w-32 border-2 border-black object-cover"
                    loading="lazy"
                />

                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-black text-2xl tracking-tighter leading-none">{name}</h3>
                            <p className="text-[10px] font-black text-yellow-600 mt-1">{team}</p>
                        </div>
                        <div className="w-8 h-8 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-black text-xs">#1</div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between border-b-2 border-slate-50 dark:border-zinc-800 pb-1">
                            <span className="text-[10px] font-black opacity-40">Goals</span>
                            <span className="font-black">{goals}</span>
                        </div>
                        <div className="flex justify-between border-b-2 border-slate-50 dark:border-zinc-800 pb-1">
                            <span className="text-[10px] font-black opacity-40">Assists</span>
                            <span className="font-black">{assists}</span>
                        </div>
                    </div>
                </div>
            </div>

            <button
                className="w-full border-t-2 border-black bg-yellow-400 text-black py-3 text-[10px] font-black tracking-widest transition-all hover:bg-black hover:text-white"
                onClick={onCompare}
                type="button"
            >
                Compare Player
            </button>
        </div>
    )
}

export default PlayerCard
