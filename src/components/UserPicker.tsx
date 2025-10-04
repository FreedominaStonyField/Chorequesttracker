import type { FormEvent } from 'react'
import { useState } from 'react'
import type { User } from '../types'
import { setHouseholdPin } from '../lib/api'

interface UserPickerProps {
  users: User[]
  onSelect: (user: User) => void
}

export function UserPicker({ users, onSelect }: UserPickerProps) {
  const [pin, setPin] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [error, setError] = useState('')

  const selectedUser = users.find((user) => user.id === selectedId)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!selectedUser) {
      setError('Choose a hero to begin the quest!')
      return
    }
    if (selectedUser.pin && selectedUser.pin !== pin) {
      setError('Incorrect household PIN')
      return
    }
    setHouseholdPin(selectedUser.pin ? pin.trim() : undefined)
    onSelect(selectedUser)
    setPin('')
    setError('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-slate-700 bg-slate-900/90 p-6 text-slate-200 shadow-xl"
    >
      <h2 className="text-xl font-semibold text-white">Who approaches the quest board?</h2>
      <div className="grid grid-cols-2 gap-3">
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => {
              setSelectedId(user.id)
              setError('')
            }}
            className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              selectedId === user.id ? 'border-primary bg-primary/20 text-white' : 'border-slate-600 bg-slate-800/80 hover:border-primary/60'
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {user.avatarEmoji}
            </span>
            <span>{user.name}</span>
          </button>
        ))}
      </div>
      {selectedUser?.pin && (
        <label className="flex flex-col gap-2 text-sm">
          Household PIN
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:border-primary"
            required
          />
        </label>
      )}
      {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
      <button
        type="submit"
        className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg transition hover:bg-indigo-500"
      >
        Enter the hall
      </button>
    </form>
  )
}
