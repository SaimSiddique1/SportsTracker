import { useMemo, useState } from "react";

interface PlayerInfo {
  name: string;
  team: string;
  goals: number;
  assists: number;
  imageUrl: string;
  onCompare?: () => void;
}

function PlayerCard({ name, team, goals, assists, imageUrl, onCompare }: PlayerInfo) {
  const fallbackImage = useMemo(
    () =>
      `data:image/svg+xml;utf8,${encodeURIComponent(`
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
    <article
      aria-label={`${name}, ${team}`}
      className="
        border-2 border-black bg-white transition-all
        dark:border-zinc-700 dark:bg-zinc-900
      "
    >
      <div className="grid grid-cols-[8rem_1fr] gap-4 p-6">
        <img
          src={currentImage}
          alt={name}
          className="h-32 w-32 border-2 border-black object-cover dark:border-zinc-600"
          loading="lazy"
          onError={() => setCurrentImage(fallbackImage)}
        />

        <div>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-black leading-none tracking-tighter dark:text-zinc-100">
                {name}
              </h3>
              <p className="mt-1 text-[10px] font-black text-yellow-600 dark:text-yellow-400">
                {team}
              </p>
            </div>
            {/* Decorative rank badge — hidden from AT */}
            <div
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center bg-slate-100 text-xs font-black dark:bg-zinc-800 dark:text-zinc-300"
            >
              #1
            </div>
          </div>

          {/* Stats */}
          <dl className="space-y-2">
            <div className="flex justify-between border-b-2 border-slate-100 pb-1 dark:border-zinc-700">
              <dt className="text-[10px] font-black opacity-40 dark:text-zinc-400">Goals</dt>
              <dd className="font-black dark:text-zinc-100">{goals}</dd>
            </div>
            <div className="flex justify-between border-b-2 border-slate-100 pb-1 dark:border-zinc-700">
              <dt className="text-[10px] font-black opacity-40 dark:text-zinc-400">Assists</dt>
              <dd className="font-black dark:text-zinc-100">{assists}</dd>
            </div>
          </dl>
        </div>
      </div>

      <button
        type="button"
        onClick={onCompare}
        disabled={!onCompare}
        aria-label={`Compare ${name}`}
        className="
          w-full border-t-2 border-black bg-yellow-400 py-3 text-[10px] font-black
          tracking-widest text-black transition-all
          hover:bg-black hover:text-white
          focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-black
          disabled:cursor-not-allowed disabled:opacity-40
          dark:border-zinc-700
        "
      >
        Compare Player
      </button>
    </article>
  );
}

export default PlayerCard;