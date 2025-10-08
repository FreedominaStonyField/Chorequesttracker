import { useEffect, useMemo, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useAtom } from 'jotai'
import { useRepositoryEvents, useUsers } from './hooks/useRepository'
import { useSeedData } from './data/seedLoader'
import { currentUserAtom } from './lib/state'
import { AppHeader } from './components/AppHeader'
import { BottomTabBar } from './components/BottomTabBar'
import { UserPicker } from './components/UserPicker'
import { FeedPage } from './pages/FeedPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { EditorPage } from './pages/EditorPage'

export default function App() {
  const { data: users } = useUsers()
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const navigate = useNavigate()
  useSeedData()
  useRepositoryEvents()

  useEffect(() => {
    if (users && users.length && !currentUser) {
      setCurrentUser(users[0])
    }
  }, [users, currentUser, setCurrentUser])

  const actions = useMemo(
    () => [
      <button
        key="editor"
        type="button"
        onClick={() => navigate('/editor')}
        className="hidden rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-primary lg:inline-flex"
      >
        Template Forge
      </button>,
    ],
    [navigate],
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
        <AppHeader currentUser={currentUser} onUserSelect={() => setUserModalOpen(true)} actions={actions} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/pile" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="*" element={<FeedPage />} />
          </Routes>
        </main>
        <BottomTabBar />
        <footer className="pb-6 text-center text-xs text-slate-500">
          <p>QuestBoard keeps your household adventures synced offline-first with IndexedDB and React Query.</p>
        </footer>
      </div>
      {userModalOpen && users && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
          <UserPicker
            users={users}
            onSelect={(user) => {
              setCurrentUser(user)
              setUserModalOpen(false)
            }}
          />
          <button
            type="button"
            className="absolute top-6 right-6 rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-sm text-slate-200 hover:border-primary"
            onClick={() => setUserModalOpen(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
