import { useNavigate } from 'react-router-dom'
import SearchBar from '../components/SearchBar'

function HomePage() {
  const navigate = useNavigate()

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <main className="page page--home">
      <section className="hero-card">
        <h1>Global search</h1>
        <SearchBar onSearch={handleSearch} />
      </section>
    </main>
  )
}

export default HomePage
