export type Difficulty = 'easy' | 'normal' | 'hard' | 'boss'
export type Recurrence = 'once' | 'daily' | 'weekly' | 'monthly'
export type CardStatus = 'available' | 'claimed' | 'completed' | 'expired'

export interface User {
  id: string
  name: string
  color: string
  avatarEmoji: string
  joinDate: string
  isAdult?: boolean
  pin?: string
}

export interface CardTemplate {
  id: string
  title: string
  flavorText?: string
  difficulty: Difficulty
  points: number
  recurrence: Recurrence
  active: boolean
  tags: string[]
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  weekAnchor?: number
  monthAnchor?: number
  requireProof?: boolean
}

export interface CardInstance {
  id: string
  templateId: string
  scheduledFor: string
  status: CardStatus
  assignedTo?: string
  createdAt: string
  expiresAt: string
}

export interface Claim {
  id: string
  cardInstanceId: string
  userId: string
  claimedAt: string
  expiresAt: string
}

export interface Completion {
  id: string
  cardInstanceId: string
  userId: string
  completedAt: string
  proofNote?: string
  proofPhotoUrl?: string
  streaksAwarded?: StreakSnapshot
  pointsAwarded: number
}

export interface InventoryItem {
  templateId: string
  timesCompleted: number
  lastCompletedAt?: string
}

export interface UserInventory {
  userId: string
  items: InventoryItem[]
  totalPoints: number
  badges: BadgeUnlock[]
  streaks: StreakState
}

export interface BadgeUnlock {
  id: string
  badgeId: BadgeId
  unlockedAt: string
  details?: Record<string, unknown>
}

export type BadgeId =
  | 'first-blood'
  | 'early-bird'
  | 'iron-week'
  | 'house-hero-week'
  | 'house-hero-month'
  | 'house-hero-all'

export interface AuditLog<TPayload = unknown> {
  id: string
  type: 'create' | 'update' | 'delete' | 'action'
  actorUserId: string
  at: string
  payload: TPayload
}

export interface Settings {
  refreshHour: number
  weekAnchor: number
  monthAnchor: number
  proofRequiredTemplateIds: string[]
}

export type StreakKey = Recurrence

export interface StreakState {
  daily: number
  weekly: number
  monthly: number
  once: number
  longest: Partial<Record<StreakKey, number>>
}

export type StreakSnapshot = Partial<Record<StreakKey, number>>

export interface SyncEnvelope<T = unknown> {
  type: string
  payload: T
  createdAt: string
}

export interface RepositoryEvent<T = unknown> {
  type: string
  payload: T
}

export interface NotificationPreference {
  userId: string
  pushToken?: string
  notifyOnLeaderboard: boolean
  notifyOnNewQuests: boolean
}

export interface QuestFilterState {
  search: string
  difficulty: Difficulty | 'all'
  recurrence: Recurrence | 'all'
  status: CardStatus | 'all'
  mine: boolean
  unclaimed: boolean
  completed: boolean
  tags: string[]
}

export interface FeedCard extends CardInstance {
  template: CardTemplate
  assignedUser?: User
  completion?: Completion
}
