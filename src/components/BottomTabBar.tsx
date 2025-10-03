import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import type { ReactNode } from 'react'

interface TabLink {
  to: string
  label: string
  icon: ReactNode
}

const tabs: TabLink[] = [
  { to: '/', label: 'Feed', icon: '🗺️' },
  { to: '/pile', label: 'Pile', icon: '🎴' },
  { to: '/leaderboard', label: 'Rankings', icon: '🏆' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export function BottomTabBar() {
  return (
    <nav className="sticky bottom-0 mt-6 w-full rounded-t-3xl border border-slate-700 bg-slate-900/95 p-3 backdrop-blur lg:hidden">
      <div className="grid grid-cols-4 gap-2 text-sm text-slate-300">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center rounded-xl px-2 py-2 font-medium transition',
                isActive ? 'bg-primary/20 text-primary-foreground shadow' : 'hover:bg-slate-800/70',
              )
            }
          >
            <span className="text-lg" aria-hidden>
              {tab.icon}
            </span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
