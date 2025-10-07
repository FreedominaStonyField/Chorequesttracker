import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSeedTemplates, createSeedUsers } from 'shared/seeds'
import type { CardTemplate, Settings, User } from 'shared/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '../data')
const databaseFile = path.join(dataDir, 'chorequest.sqlite')

mkdirSync(dataDir, { recursive: true })

export const db = new Database(databaseFile)

db.pragma('journal_mode = WAL')

type JsonRow = { id: string; data: string }

type JsonTable =
  | 'users'
  | 'templates'
  | 'instances'
  | 'claims'
  | 'completions'
  | 'inventories'
  | 'audit_logs'

const jsonTables: JsonTable[] = ['users', 'templates', 'instances', 'claims', 'completions', 'inventories', 'audit_logs']

export function initializeDatabase() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    )`
  ).run()

  for (const table of jsonTables) {
    db.prepare(
      `CREATE TABLE IF NOT EXISTS ${table} (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )`
    ).run()
  }

  seedDefaults()
}

function seedDefaults() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (userCount.count === 0) {
    const users = createSeedUsers()
    const insert = db.prepare('INSERT INTO users (id, data) VALUES (@id, @data)')
    const insertMany = db.transaction((records: User[]) => {
      for (const record of records) {
        insert.run({ id: record.id, data: JSON.stringify(record) })
      }
    })
    insertMany(users)
  }

  const templateCount = db.prepare('SELECT COUNT(*) as count FROM templates').get() as { count: number }
  if (templateCount.count === 0) {
    const templates = createSeedTemplates()
    const insert = db.prepare('INSERT INTO templates (id, data) VALUES (@id, @data)')
    const insertMany = db.transaction((records: CardTemplate[]) => {
      for (const record of records) {
        insert.run({ id: record.id, data: JSON.stringify(record) })
      }
    })
    insertMany(templates)
  }

  const settingsExists = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number }
  if (settingsExists.count === 0) {
    const defaultSettings: Settings = {
      refreshHour: 0,
      weekAnchor: 1,
      monthAnchor: 1,
      proofRequiredTemplateIds: [],
    }
    db.prepare('INSERT INTO settings (id, data) VALUES (1, ?)').run(JSON.stringify(defaultSettings))
  }
}

export function readAll<T>(table: JsonTable): T[] {
  const rows = db.prepare(`SELECT data FROM ${table}`).all() as JsonRow[]
  return rows.map((row) => JSON.parse(row.data) as T)
}

export function readById<T>(table: JsonTable, id: string): T | undefined {
  const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id) as JsonRow | undefined
  return row ? (JSON.parse(row.data) as T) : undefined
}

export function upsert<T extends { id: string }>(table: JsonTable, entity: T) {
  db.prepare(`INSERT INTO ${table} (id, data) VALUES (@id, @data) ON CONFLICT(id) DO UPDATE SET data = excluded.data`).run({
    id: entity.id,
    data: JSON.stringify(entity),
  })
}

export function remove(table: JsonTable, id: string) {
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
}

export function replaceAll<T extends { id: string }>(table: JsonTable, entities: T[]) {
  const stmt = db.prepare(`INSERT INTO ${table} (id, data) VALUES (@id, @data) ON CONFLICT(id) DO UPDATE SET data = excluded.data`)
  const runMany = db.transaction((records: T[]) => {
    for (const record of records) {
      stmt.run({ id: record.id, data: JSON.stringify(record) })
    }
  })
  runMany(entities)
}

export function readSettings(): Settings {
  const row = db.prepare('SELECT data FROM settings WHERE id = 1').get() as { data: string } | undefined
  if (!row) {
    const defaultSettings: Settings = {
      refreshHour: 0,
      weekAnchor: 1,
      monthAnchor: 1,
      proofRequiredTemplateIds: [],
    }
    db.prepare('INSERT INTO settings (id, data) VALUES (1, ?)').run(JSON.stringify(defaultSettings))
    return defaultSettings
  }
  return JSON.parse(row.data) as Settings
}

export function writeSettings(settings: Settings) {
  db.prepare('INSERT INTO settings (id, data) VALUES (1, @data) ON CONFLICT(id) DO UPDATE SET data = excluded.data').run({
    data: JSON.stringify(settings),
  })
}
