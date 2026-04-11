import { useNavigate } from 'react-router-dom'
import SearchBar from '../../components/SearchBar'

function HomePage() {
  const navigate = useNavigate()

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <section>
      <SearchBar onSearch={handleSearch} />
     </section>
  )
}

export default HomePage
