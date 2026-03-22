import { useState } from 'react'

function LeagueTable() {
    const [currLeague, setCurrLeague] = useState('LGE');

    const leagues = [
        {id: 'LGE', name: 'League 1'},
        {id: 'LGE', name: 'League 2'},
        {id: 'LGE', name: 'League 3'},
    ]

    const teams = [
        {rank: 1, name: "Team 1", played: 1, pts: 5},
        {rank: 2, name: "Team 2", played: 1, pts: 5},
        {rank: 3, name: "Team 3", played: 1, pts: 5},
        {rank: 4, name: "Team 4", played: 1, pts: 5},
        {rank: 5, name: "Team 5", played: 1, pts: 5}
    ]
    
    return (
        <div className='space-y-6'>
            <div className='flex flex-wrap gap-2 border-b-2 border-slate-100 dark:border-zinc-800 pb-4'>
                {leagues.map((league) => (
                    <button key={league.id} onClick={() => setCurrLeague(league.id)} className={`px-3 py-1 text-[10px] font-black tracking-tighter transition-all border-2 ${currLeague === league.id ? 'bg-yellow-400 border-black text-black' : 'bg-transparent border-transparent opacity-50 hover:opacity-100'}`}>{league.id}</button>
                ))}
            </div>

            <div className="space-y-2">
                <div className='grid grid-cols-6 text-[10px] font-black opacity-40 px-2'>
                    <span className='col-span-3 font-black'>Team</span>
                    <span>Played</span>
                    <span>Points</span>
                </div>

                {teams.map((t) => (
                    <div key={t.rank} className='grid grid-cols-6 items-center py-3 border-b border-slate-100 dark:border-zinc-800 text-sm hover:bg-yellow-400 dark:hover:text-black transition-colors px-2 font-bold cursor-pointer'>
                        <div className='col-span-3 flex gap-2'>
                            <span className='text-yellow-600 group-hover:text-black'>{t.rank}</span>
                            <span className='truncate'>{t.name}</span>
                        </div>
                        <span className='opacity-60 group-hover:opacity-100'>{t.played}</span>
                        <span className='font-black'>{t.pts}</span>
                    </div>
                ))}
            </div>

            <button className='w-full bg-slate-100 dark:bg-zinc-800 py-3 text-[10px] font-black tracking-[0.2em] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all'>
                Full Standings
            </button>
        </div>
    )
}

export default LeagueTable