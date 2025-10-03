import { atom } from 'jotai'
import type { QuestFilterState, User } from '../types'

export const currentUserAtom = atom<User | null>(null)

export const questFilterAtom = atom<QuestFilterState>({
  search: '',
  difficulty: 'all',
  recurrence: 'all',
  status: 'all',
  mine: false,
  unclaimed: false,
  completed: false,
  tags: [],
})
