import { useState } from 'react'
import type { FormEvent } from 'react'

export type SearchMode = 'players' | 'teams' | 'competitions'

type SearchBarProps = {
  initialValue?: string
  initialMode?: SearchMode
  onSearch: (query: string, mode: SearchMode) => void
  placeholder?: string
}

function SearchBar({
  initialValue = '',
  initialMode = 'players',
  onSearch,
  placeholder = 'Search players, teams, or competitions',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue)
  const [mode, setMode] = useState<SearchMode>(initialMode)

  const runSearch = (nextMode: SearchMode) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return
    }

    setMode(nextMode)
    onSearch(trimmedQuery, nextMode)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    runSearch(mode)
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      {/*<label className="search-bar__label" htmlFor="global-search">
        Search
      </label>*/}
      <div className="search-bar__controls flex items-center">
        <input
          id="global-search"
          className="search-bar__input bg-zinc-900 px-2 py-2 border-2 border-black text-sm mr-1 w-2xl"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
        />
        <select className='border-2 border-black bg-yellow-400 text-black px-2 py-2 text-xs font-extrabold uppercase' value={mode} onChange={(e) => setMode(e.target.value as SearchMode)}>
          <option value="players">Players</option>
          <option value="teams">Teams</option>
          <option value="competitions">Competitions</option>
        </select>
      </div>
      {/*<div className="mt-3 flex flex-wrap gap-2">
        <button
          className={`border-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${
            mode === 'players' ? 'border-black bg-black text-white' : 'border-black bg-white text-black'
          }`}
          type="button"
          onClick={() => runSearch('players')}
        >
          Search Players
        </button>
        <button
          className={`border-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${
            mode === 'teams' ? 'border-black bg-yellow-400 text-black' : 'border-black bg-white text-black'
          }`}
          type="button"
          onClick={() => runSearch('teams')}
        >
          Search Teams
        </button>
        <button
          className={`border-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${
            mode === 'competitions' ? 'border-black bg-slate-200 text-black' : 'border-black bg-white text-black'
          }`}
          type="button"
          onClick={() => runSearch('competitions')}
        >
          Search Competitions
        </button>
      </div>*/}
    </form>
  )
}

export default SearchBar
