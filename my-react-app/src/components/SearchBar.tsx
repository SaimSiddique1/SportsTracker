import { useState } from 'react'
import type { FormEvent } from 'react'

export type SearchMode = 'players' | 'teams' | 'competitions'

type SearchBarProps = {
  initialValue?: string
  initialMode?: SearchMode
  onSearch: (query: string, mode: SearchMode) => void
  placeholder?: string
  showFilters?: boolean
}

function SearchBar({
  initialValue = '',
  initialMode = 'players',
  onSearch,
  placeholder = 'Search players, teams, or competitions',
  showFilters = true,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue)
  const [mode, setMode] = useState<SearchMode>(initialMode)

  const runSearch = (nextMode: SearchMode) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return
    setMode(nextMode)
    onSearch(trimmedQuery, nextMode)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    runSearch(mode)
  }

  const modeLabels: Record<SearchMode, string> = {
    players: 'Search Players',
    teams: 'Search Teams',
    competitions: 'Search Competitions',
  }

  return (
    <form
      className="search-bar"
      onSubmit={handleSubmit}
      role="search"
      aria-label="Sports Tracker search"
    >
      <div className="search-bar__controls flex items-center gap-0">
        {/* Visible label — visually hidden but accessible */}
        <label
          htmlFor="global-search"
          className="sr-only"
        >
          Search {modeLabels[mode].toLowerCase()}
        </label>

        <input
          id="global-search"
          className="
            search-bar__input mr-1 w-full
            border-2 border-black bg-white px-2 py-2
            text-sm text-black outline-none
            placeholder:text-slate-500
            focus:bg-yellow-50 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-1
            dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500
            dark:border-zinc-700 dark:focus:bg-zinc-800
            md:w-2xl
          "
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={`Search ${mode}`}
        />

        <label htmlFor="search-mode-select" className="sr-only">
          Search category
        </label>
        <select
          id="search-mode-select"
          className="
            border-2 border-black bg-yellow-400 text-black
            px-2 py-2 text-xs font-extrabold uppercase
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1
            dark:border-zinc-700
          "
          value={mode}
          onChange={(e) => setMode(e.target.value as SearchMode)}
          aria-label="Search category"
        >
          <option value="players">Players</option>
          <option value="teams">Teams</option>
          <option value="competitions">Competitions</option>
        </select>

        {/* Hidden submit for keyboard users who press Enter */}
        <button type="submit" className="sr-only">
          Search
        </button>
      </div>

      {showFilters ? (
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Quick search filters">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400" aria-hidden="true">
            Filter:
          </span>
          {(['players', 'teams', 'competitions'] as SearchMode[]).map((m) => (
            <button
              key={m}
              className={`
                border-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em]
                transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1
                ${mode === m
                  ? m === 'players'
                    ? 'border-black bg-black text-white'
                    : m === 'teams'
                    ? 'border-black bg-yellow-400 text-black'
                    : 'border-black bg-slate-200 text-black'
                  : 'border-black bg-white text-black hover:bg-slate-100 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
                }
              `}
              type="button"
              aria-pressed={mode === m}
              onClick={() => runSearch(m)}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  )
}

export default SearchBar