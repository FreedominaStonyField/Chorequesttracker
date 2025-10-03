# QuestBoard Server

QuestBoard Server is a Node.js + TypeScript backend that powers the QuestBoard progressive web app. It exposes an Express API with SQLite persistence so multiple households can share templates, quest instances, and completion history instead of relying on each browser's Dexie store.

## Features

- ✅ Production-ready Express server with Swagger documentation at `/docs`.
- 🗂️ SQLite database managed through Drizzle ORM migrations.
- 🔁 Recurrence + expiry scheduler that mirrors the QuestBoard PWA logic.
- 🛡️ PIN-based authentication middleware backed by bcrypt hashes.
- 📬 Offline sync support through a `SyncEnvelope` batch endpoint.
- 📊 Leaderboard, history, inventory, and audit log services for the mobile app.

## Project structure

```
src/
  app.ts              Express app wiring (logging, CORS, Swagger, routes)
  index.ts            Server bootstrap
  config.ts           Environment configuration helper
  db/                 Drizzle client, schema, migrations, seeds
  jobs/               Recurrence scheduler
  models/             Shared domain types + mappers
  routes/             Express routers with Zod validation
  services/           Business logic (cards, users, settings, sync, etc.)
  tests/              Vitest + Supertest suites
```

## Prerequisites

- Node.js 20+
- npm 10+

All dependencies are vendored in `package.json`. SQLite is bundled with the Node runtime; no external server is required.

## Installation & local development

```bash
npm install
npm run db:migrate   # apply drizzle migrations against questboard.sqlite
npm run db:seed      # optional: load demo users + templates
npm run dev          # start development server with ts-node-dev
```

The server listens on `http://localhost:3000` by default. Swagger UI is available at `http://localhost:3000/docs` and lists the full API surface.

### Environment variables

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `PORT` | `3000` | HTTP port for the Express server. |
| `DATABASE_URL` | `./questboard.sqlite` | Path to the SQLite database file. |
| `VITE_ORIGIN` | `http://localhost:5173` | Allowed CORS origin for local development. |
| `PROD_ORIGIN` | – | Optional additional CORS origin for production deployments. |
| `BCRYPT_ROUNDS` | `12` | Cost factor for bcrypt hashing of user PINs. |
| `PIN_BYPASS_SECRET` | – | Optional server-side override that bypasses PIN checks (useful for admin tooling). |
| `TZ` | host default | Time zone used by the midnight recurrence scheduler. |

Create a `.env` file in the project root to override these values during development.

### Database operations

- `npm run db:migrate` – Run pending Drizzle migrations.
- `npm run db:seed` – Populate demo users, templates, and settings.
- *(Optional)* launch Drizzle Studio with `npx drizzle-kit studio` (after installing `drizzle-kit`) to inspect `questboard.sqlite`.

The generated SQL migrations live under `src/db/migrations`. The migration runner reads the `drizzle.config.ts` file and stores history in `src/db/migrations/meta/`.

### Testing & quality

```bash
npm run lint   # ESLint (TypeScript + Prettier config)
npm test       # Vitest unit + integration suites
npm run build  # Type-check and emit to dist/
```

Vitest coverage includes recurrence scheduling, claim collisions, completion inventory updates, leaderboard tie-breaking, and end-to-end API workflows with Supertest.

### Running in production

```bash
npm run build
npm run start
```

`npm run start` executes the compiled JavaScript from `dist/`. Ensure that `DATABASE_URL` points to a writable location and that migrations have already been applied.

## Integrating with the QuestBoard PWA

1. Deploy this server and ensure it is reachable from your QuestBoard PWA clients.
2. In the PWA repository, update the repository layer or environment variables to point API calls at the server base URL (for local development, `http://localhost:3000`).
3. Provide the household members' `id`/`pin` pairs to the client so requests include `X-User-Id` and `X-User-PIN` headers.
4. Use the `/sync` endpoint for offline mutation replay: queue `SyncEnvelope<T>` objects in the PWA and POST them when connectivity returns.

Refer to the Swagger docs for payload shapes across `/users`, `/templates`, `/feed`, `/cards/:id/claim`, `/cards/:id/complete`, `/leaderboard`, `/history/:userId`, `/inventory/:userId`, `/settings`, `/sync`, and `/audit-log`.

## Background jobs

A cron-style scheduler in `src/jobs/scheduler.ts` runs nightly at local midnight (configurable via `TZ`). It spawns instances for active templates using `computeNextInstanceDate` / `computeExpiry` helpers and expires overdue cards.

## Troubleshooting

- **Transaction errors** – Drizzle's SQLite transactions require synchronous callbacks. Avoid `await` inside `db.transaction` blocks.
- **Authentication failures** – Confirm the `users.pin_hash` column contains bcrypt hashes created with the same `BCRYPT_ROUNDS` value.
- **CORS issues** – Verify the client origin appears in `VITE_ORIGIN` or `PROD_ORIGIN`.

## License

This project inherits the license of the QuestBoard repository. See `LICENSE` (if present) for details.
