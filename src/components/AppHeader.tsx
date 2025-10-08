import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { User } from '../types'
import clsx from 'clsx'

interface AppHeaderProps {
  currentUser: User | null
  onUserSelect: () => void
  actions?: ReactNode
}

export function AppHeader({ currentUser, onUserSelect, actions }: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary/70">QuestBoard</p>
          <h1 className="text-2xl font-bold text-white lg:text-3xl">Household Quest Ledger</h1>
        </div>
        <button
          type="button"
          onClick={onUserSelect}
          className={clsx(
            'flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-100 shadow-inner transition hover:border-primary hover:text-white',
            { 'ring-2 ring-primary/60': !currentUser },
          )}
        >
          <span aria-hidden className="text-xl">{currentUser?.avatarEmoji ?? '🧭'}</span>
          {currentUser ? currentUser.name : 'Choose Adventurer'}
        </button>
      </div>
      <nav className="hidden items-center gap-3 text-sm font-semibold text-slate-300 lg:flex">
        <NavLink
          to="/"
          className={({ isActive }) =>
            clsx(
              'rounded-full px-4 py-2 transition',
              isActive ? 'bg-primary/20 text-primary-foreground shadow' : 'hover:bg-slate-800/70',
            )
          }
        >
          Quest Feed
        </NavLink>
        <NavLink
          to="/pile"
          className={({ isActive }) =>
            clsx(
              'rounded-full px-4 py-2 transition',
              isActive ? 'bg-primary/20 text-primary-foreground shadow' : 'hover:bg-slate-800/70',
            )
          }
        >
          My Pile
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'rounded-full px-4 py-2 transition',
              isActive ? 'bg-primary/20 text-primary-foreground shadow' : 'hover:bg-slate-800/70',
            )
          }
        >
          Settings
        </NavLink>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </nav>
    </header>
  )
}
