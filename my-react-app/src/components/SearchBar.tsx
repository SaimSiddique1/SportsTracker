import { useState } from "react";
import type { FormEvent } from "react";

export type SearchMode = "players" | "teams" | "competitions";

type SearchBarProps = {
  initialValue?: string;
  initialMode?: SearchMode;
  onSearch: (query: string, mode: SearchMode) => void;
  placeholder?: string;
  showFilters?: boolean;
};

const modes: { value: SearchMode; label: string }[] = [
  { value: "players",      label: "Players" },
  { value: "teams",        label: "Teams" },
  { value: "competitions", label: "Competitions" },
];

function SearchBar({
  initialValue = "",
  initialMode = "players",
  onSearch,
  placeholder = "Search players, teams, or competitions",
  showFilters = true,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [mode, setMode] = useState<SearchMode>(initialMode);

  const runSearch = (nextMode: SearchMode) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setMode(nextMode);
    onSearch(trimmed, nextMode);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    runSearch(mode);
  };

  return (
    <form
      role="search"
      aria-label="Site search"
      className="search-bar"
      onSubmit={handleSubmit}
    >
      {/* Input + mode select row */}
      <div className="flex items-center gap-1">
        <label htmlFor="global-search" className="sr-only">
          Search {mode}
        </label>
        <input
          id="global-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="
            w-full border-2 border-black bg-white px-2 py-2 text-sm text-black outline-none
            placeholder:text-slate-500 focus:bg-yellow-50
            dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100
            dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700
          "
        />

        <label htmlFor="search-mode-select" className="sr-only">
          Search category
        </label>
        <select
          id="search-mode-select"
          value={mode}
          onChange={(e) => setMode(e.target.value as SearchMode)}
          aria-label="Search category"
          className="
            border-2 border-black bg-yellow-400 px-2 py-2 text-xs font-extrabold uppercase text-black
            focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
            dark:border-zinc-600
          "
        >
          {modes.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Hidden submit for Enter key */}
        <button type="submit" className="sr-only">
          Search
        </button>
      </div>

      {/* Filter buttons (expanded view) */}
      {showFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Search filters">
          <span
            className="text-xs font-black uppercase tracking-[0.2em] text-slate-600 dark:text-zinc-400"
            aria-hidden="true"
          >
            Filter:
          </span>

          {modes.map((m) => {
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={active}
                onClick={() => runSearch(m.value)}
                className={`
                  border-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all
                  focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
                  ${active
                    ? m.value === "players"
                      ? "border-black bg-black text-white"
                      : m.value === "teams"
                      ? "border-black bg-yellow-400 text-black"
                      : "border-black bg-slate-200 text-black"
                    : "border-black bg-white text-black hover:bg-slate-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  }
                `}
              >
                Search {m.label}
              </button>
            );
          })}
        </div>
      )}
    </form>
  );
}

export default SearchBar;