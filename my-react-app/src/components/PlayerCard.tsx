import { useMemo, useState } from "react";

interface PlayerInfo {
    name: string;
    team: string;
    goals: number;
    assists: number;
    imageUrl: string;
    onCompare?: () => void;
}

function PlayerCard({name, team, goals, assists, imageUrl, onCompare} : PlayerInfo) {
    const fallbackImage = useMemo(
        () => `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
              <rect width="256" height="256" fill="#f8fafc"/>
              <rect x="10" y="10" width="236" height="236" fill="none" stroke="#000000" stroke-width="6"/>
              <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
                font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#000000">
                ${name}
              </text>
            </svg>
        `)}`,
        [name]
    );
    const [currentImage, setCurrentImage] = useState(imageUrl || fallbackImage);

    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 transition-all">
            <div className="grid grid-cols-[8rem_1fr] gap-4 p-6">
                <img
                    src={currentImage}
                    alt={name}
                    className="h-32 w-32 border-2 border-black object-cover"
                    loading="lazy"
                    onError={() => setCurrentImage(fallbackImage)}
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
                disabled={!onCompare}
            >
                Compare Player
            </button>
        </div>
    )
}

export default PlayerCard
