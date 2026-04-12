import { useNavigate } from 'react-router-dom'
import SearchBar from '../../components/SearchBar'
import type { SearchMode } from '../../components/SearchBar'

function HomePage() {
  const navigate = useNavigate()

  const handleSearch = (query: string, mode: SearchMode) => {
    navigate(`/search?q=${encodeURIComponent(query)}&mode=${mode}`)
  }

  return (
    <section>
      <SearchBar onSearch={handleSearch} />
     </section>
  )
}

export default HomePage
