import Dexie, { type Table } from 'dexie'
import type {
  AuditLog,
  CardInstance,
  CardTemplate,
  Claim,
  Completion,
  NotificationPreference,
  Settings,
  User,
  UserInventory,
} from '../types'

export class QuestBoardDatabase extends Dexie {
  users!: Table<User>
  templates!: Table<CardTemplate>
  instances!: Table<CardInstance>
  claims!: Table<Claim>
  completions!: Table<Completion>
  inventories!: Table<UserInventory>
  auditLog!: Table<AuditLog>
  settings!: Table<Settings>
  notificationPreferences!: Table<NotificationPreference>

  constructor() {
    super('quest-board')
    this.version(1).stores({
      users: 'id, name, joinDate',
      templates: 'id, recurrence, active',
      instances: 'id, templateId, scheduledFor, status, assignedTo',
      claims: 'id, cardInstanceId, userId, claimedAt',
      completions: 'id, cardInstanceId, userId, completedAt',
      inventories: 'userId',
      auditLog: 'id, type, actorUserId, at',
      settings: '++id',
      notificationPreferences: 'userId',
    })
  }
}

export const db = new QuestBoardDatabase()
