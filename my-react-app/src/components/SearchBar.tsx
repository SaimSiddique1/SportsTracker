import { useState } from 'react'
import type { FormEvent } from 'react'

type SearchBarProps = {
  initialValue?: string
  onSearch: (query: string) => void
  placeholder?: string
  buttonLabel?: string
}

function SearchBar({
  initialValue = '',
  onSearch,
  placeholder = 'Search for teams, players, matches',
  buttonLabel = 'Search',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return
    }

    onSearch(trimmedQuery)
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <label className="search-bar__label" htmlFor="global-search">
        Search
      </label>
      <div className="search-bar__controls">
        <input
          id="global-search"
          className="search-bar__input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
        />
        <button className="search-bar__button" type="submit">
          {buttonLabel}
        </button>
      </div>
    </form>
  )
}

export default SearchBar
