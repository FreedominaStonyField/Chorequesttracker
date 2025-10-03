import type { FormEvent } from 'react'
import { useState } from 'react'
import { useAtom } from 'jotai'
import { currentUserAtom } from '../lib/state'
import {
  useDeleteUserMutation,
  useSaveSettingsMutation,
  useSettings,
  useUpsertUserMutation,
  useUsers,
} from '../hooks/useRepository'
import type { Settings, User } from '../types'
import { nanoid } from 'nanoid'

interface UserFormState {
  name: string
  color: string
  avatarEmoji: string
  pin: string
  isAdult: boolean
}

const defaultUserState: UserFormState = {
  name: '',
  color: '#f8fafc',
  avatarEmoji: '😀',
  pin: '',
  isAdult: false,
}

export function SettingsPage() {
  const [currentUser] = useAtom(currentUserAtom)
  const { data: users } = useUsers()
  const { data: settings } = useSettings()
  const saveSettings = useSaveSettingsMutation()
  const upsertUser = useUpsertUserMutation()
  const deleteUser = useDeleteUserMutation()
  const [userForm, setUserForm] = useState<UserFormState>(defaultUserState)
  const [message, setMessage] = useState('')

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userForm.name.trim()) return
    const user: User = {
      id: nanoid(),
      name: userForm.name.trim(),
      color: userForm.color,
      avatarEmoji: userForm.avatarEmoji,
      joinDate: new Date().toISOString(),
      pin: userForm.pin,
      isAdult: userForm.isAdult,
    }
    await upsertUser.mutateAsync({ user, actorId: currentUser?.id })
    setUserForm(defaultUserState)
    setMessage('New hero added to the roster!')
  }

  async function handleDeleteUser(userId: string) {
    if (!currentUser) {
      setMessage('Only an authenticated hero may remove profiles.')
      return
    }
    await deleteUser.mutateAsync({ userId, actorId: currentUser.id })
    setMessage('Hero retired from the roster.')
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!settings) return
    const formData = new FormData(event.currentTarget)
    const next: Settings = {
      refreshHour: Number(formData.get('refreshHour')),
      weekAnchor: Number(formData.get('weekAnchor')),
      monthAnchor: Number(formData.get('monthAnchor')),
      proofRequiredTemplateIds: (formData.get('proofTemplates') as string)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    }
    await saveSettings.mutateAsync(next)
    setMessage('Settings saved. The quest board will regenerate at the new time.')
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-slate-700 bg-slate-900/70 p-5 text-sm text-slate-300">
        <h2 className="text-xl font-semibold text-white">House Rules</h2>
        <p className="mt-2 text-slate-400">
          Adjust the quest refresh schedule and proof requirements for legendary chores. Midnight regeneration respects the
          household time below.
        </p>
        {settings && (
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSettingsSubmit}>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Refresh hour (0-23)</span>
              <input
                type="number"
                name="refreshHour"
                min={0}
                max={23}
                defaultValue={settings.refreshHour}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Week anchor (0=Sun)</span>
              <input
                type="number"
                name="weekAnchor"
                min={0}
                max={6}
                defaultValue={settings.weekAnchor}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Month anchor (1-31)</span>
              <input
                type="number"
                name="monthAnchor"
                min={1}
                max={31}
                defaultValue={settings.monthAnchor}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Proof required templates (IDs)</span>
              <input
                type="text"
                name="proofTemplates"
                defaultValue={settings.proofRequiredTemplateIds.join(', ')}
                placeholder="laundry-weekly, windows-monthly"
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-indigo-500"
              >
                Save settings
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-3xl border border-slate-700 bg-slate-900/70 p-5 text-sm text-slate-300">
        <h2 className="text-xl font-semibold text-white">Guild Roster</h2>
        <p className="mt-2 text-slate-400">Manage heroes, assign colors and emojis, and set optional profile PINs.</p>
        <form className="mt-4 grid gap-3 md:grid-cols-5" onSubmit={handleUserSubmit}>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Name</span>
            <input
              value={userForm.name}
              onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Emoji</span>
            <input
              value={userForm.avatarEmoji}
              onChange={(event) => setUserForm((prev) => ({ ...prev, avatarEmoji: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Color</span>
            <input
              type="color"
              value={userForm.color}
              onChange={(event) => setUserForm((prev) => ({ ...prev, color: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">PIN</span>
            <input
              value={userForm.pin}
              onChange={(event) => setUserForm((prev) => ({ ...prev, pin: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              placeholder="Optional"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={userForm.isAdult}
              onChange={(event) => setUserForm((prev) => ({ ...prev, isAdult: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800"
            />
            Adult permissions
          </label>
          <div className="md:col-span-5">
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-indigo-500"
            >
              Add hero
            </button>
          </div>
        </form>
        <ul className="mt-4 space-y-3">
          {users?.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {user.avatarEmoji}
                </span>
                <div>
                  <p className="text-base font-semibold text-white">{user.name}</p>
                  <p className="text-xs text-slate-400">
                    Joined {new Date(user.joinDate).toLocaleDateString()} • PIN {user.pin ? 'enabled' : 'not set'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteUser(user.id)}
                className="rounded-xl border border-red-500/60 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {message && <p className="rounded-2xl bg-emerald-600/20 px-4 py-3 text-sm text-emerald-200">{message}</p>}
    </div>
  )
}
