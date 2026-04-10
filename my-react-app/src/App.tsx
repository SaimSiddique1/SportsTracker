//import {  } from 'react'
import MatchCarousel from './components/MatchCarousel'
import LeagueTable from './components/LeagueTable'
import PlayerCard from './components/PlayerCard'
import RealTimeStats from './components/RealTimeStats'
//import LoginPage from './assets/pages/LoginPage'

function App() {
  return (
    <div>
      <div className='min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 selection:bg-yellow-400'>
        {/* Nav Bar/Header */}
        <nav className='sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b-4 border-black dark:border-zinc-800'>
          {/* Logo and App Name */}
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 bg-yellow-400 border-2 border-black flex items-center justify-center text-black font-black text-2xl'>Logo</div>
            <h1 className='text-3xl font-black tracking-tighter'>Sports <span className='text-yellow-500 dark:text-yellow-500'>Tracker</span></h1>
          </div>

          {/* Search Bar */}
          <div className='flex-1 max-w-lg mx-12 hidden lg:block'>
            <input type='text' placeholder='Search players, teams, and more...' className='w-full bg-slate-100 dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 px-6 py-3 focus:outline-none focus:bg-yellow-50 dark:focus:bg-zinc-800 transition-all text-xs font-black'/>
          </div>

          {/* Light/Dark Mode and Registration/Login */}
          <div className='flex items-center gap-4'>
            <button className='p-2 border-2 border-black dark:border-white bg-white dark:bg-black font-black w-10 h-10 transition-all'>
              Mode
            </button>
            <button className='px-8 py-3 bg-yellow-400 text-black border-2 border-black font-black hover:shadow-none hover:translate-x- hover:translate-y- transition-all text-xs tracking-[0.2em]'>
              Login / Register
            </button>
          </div>
        </nav>

        <MatchCarousel/>

        {/* Main Content */}
        <main className='max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 p-8'>
          <section className='lg:col-span-8 space-y-12'>
            <div className='p-12 bg-zinc-900 text-white border border-slate-800 relative overflow-hidden'>
              <div className='relative z-10'>
                <h2 className='text-5xl font-black mb-4 tracking-tighter leading-tight'>Welcome to Sports <span className='text-yellow-400'>Tracker</span>!</h2>
                <p className='text-slate-400 mb-8 max-w-sm font-bold text-[10px] tracking-widest'>See real-time stats, head-to-head comparisons, and full season schedules.</p>
                <div className='flex gap-4'>
                  <button className='bg-yellow-400 text-black px-6 py-3 font-black text-xs tracking-widest hover:bg-white transition-colors'>
                    Compare Players
                  </button>
                  <button className='bg-white/10 border border-white/20 px-8 py-3 font-black text-xs tracking-widest hover:bg-white/20 transition-colors'>
                    Schedules
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className='font-black text-2xl tracking-tighter mb-6'>Trending Players</h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <PlayerCard name="First Last" team="Team" goals={1} assists={1}/>
                <PlayerCard name="First Last" team="Team" goals={1} assists={1}/>
              </div>
            </div>
          </section>

          <aside className='lg:col-span-4'>
            <div className='bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6'>
              <h3 className='font-black text-xl mb-6 tracking-tighter border-b-4 border-yellow-400 inline-block'>League Table</h3>
              <LeagueTable/>
              <RealTimeStats/>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}

export default App
