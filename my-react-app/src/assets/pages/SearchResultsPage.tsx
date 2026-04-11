import { useNavigate, useSearchParams } from 'react-router-dom'
import SearchBar from '../../components/SearchBar'

function SearchResultsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const query = searchParams.get('q')?.trim() ?? ''

  const handleSearch = (nextQuery: string) => {
    navigate(`/search?q=${encodeURIComponent(nextQuery)}`)
  }

  return (
    <main className="page">
      <section className="results-card">
        <h1>Global search</h1>
        <SearchBar
          initialValue={query}
          onSearch={handleSearch}
          placeholder="Search for teams, players, matches"
          buttonLabel="Search"
        />

        <div className="results-panel">
          {query ? (
            <>
              <p className="results-query">{query}</p>
            </>
          ) : (
            <p className="results-copy">Search</p>
          )}
        </div>
      </section>
    </main>
  )
}

export default SearchResultsPage
