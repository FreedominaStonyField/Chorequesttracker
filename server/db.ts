import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DB_DIRECTORY ?? join(process.cwd(), 'data')
const DB_FILE = process.env.DB_PATH ?? join(DATA_DIR, 'app.db')

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

mkdirSync(dirname(DB_FILE), { recursive: true })

export const db = new Database(DB_FILE)

db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('foreign_keys = ON')

const schemaPath = join(__dirname, 'schema.sql')
const schema = readFileSync(schemaPath, 'utf8')
db.exec(schema)

type TransactionHandler<T> = () => T

export function withTransaction<T>(handler: TransactionHandler<T>): T {
  return db.transaction(handler)()
}
