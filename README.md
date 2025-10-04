# QuestBoard

QuestBoard is a mobile-first React + TypeScript progressive web app that turns recurring family chores into collectible quest cards. A lightweight Node + Express API backed by SQLite keeps rosters, templates, and quest state in sync across every browser that connects.

## Features

- 📋 **Quest Feed** – Claim, complete, or craft new quest cards with tactile tiles, difficulty frames, and recurrence filters.
- 🕒 **Automated recurrence** – Daily, weekly, monthly, and one-time templates spawn instances at local midnight with configurable anchors.
- 🧾 **My Pile history** – Timeline of every completion with export to CSV/JSON plus filter by tag, difficulty, recurrence, or date range.
- 🛠️ **Template forge** – Create, duplicate, activate/deactivate, or bulk-edit quest templates with live previews.
- 🧑‍🤝‍🧑 **Roster management** – Add users with avatars, colours, and optional household PINs; adult guardians can manage everything.
- 🏆 **Leaderboard** – Weekly, monthly, and all-time scoreboards with tie-breaking by completions and earliest turn-ins.
- 🔔 **Gamification** – Difficulty multipliers, streak tracking, badge unlocks, and rotating quest completion flavour lines.
- 📱 **PWA ready** – Installable on iOS/Android/desktop with offline-first UI caching backed by React Query + SQLite persistence.
- ♿ **Accessibility** – High-contrast palette, focus-visible styles, semantic labelling, and screen-reader friendly copy.

## Tech stack

- React 19 + TypeScript, Vite, TailwindCSS
- State/data: React Query, Jotai, Axios client targeting the QuestBoard REST API
- Backend: Express 4, better-sqlite3, Zod validation
- Testing: Vitest, Testing Library, Supertest integration tests
- PWA tooling: vite-plugin-pwa, custom icons, offline-first service worker

## Getting started

```bash
npm install
npm run dev:server  # starts the API on http://localhost:3001/api
npm run dev         # starts the Vite dev server on http://localhost:5173
```

The UI talks to `http://localhost:3001/api` by default. Override with `VITE_API_BASE_URL` if you proxy through another host/port.

The server stores data in `./data/app.db`. Set `DB_PATH` to change the file or `DB_DIRECTORY` for the containing folder. For production builds run `npm run build:server` followed by `npm run start:server`.

### API docs

- A lightweight OpenAPI description lives at `server/openapi.json`. Import it into Postman/Insomnia or serve it through Swagger UI to explore available endpoints.

### Bootstrap flow

- The API allows the very first `POST /users` request to succeed without a household PIN so that an initial guardian account can be created from a fresh database.
- After at least one user exists, all subsequent mutations require a valid `X-Household-Pin` header or a matching `PIN_BYPASS_SECRET` environment variable to act as the system identity.
- Configure `PIN_BYPASS_SECRET` for automation or bootstrap scripts that need to run before any household accounts have been provisioned.
- Authenticated requests automatically infer the acting user from the provided PIN so audit logs retain actor information.

### Available scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start the Vite dev server |
| `npm run dev:server` | Run the API with hot reloading via tsx |
| `npm run build` | Type-check and create a production build (UI + server) |
| `npm run build:server` | Compile the API to `dist/server` |
| `npm run start:server` | Serve the compiled API |
| `npm run preview` | Preview the built app |
| `npm run lint` | Run ESLint over the project |
| `npm run test` | Execute the Vitest unit test suite |
| `npm run test:coverage` | Run tests with coverage reporting |

## Offline & sync notes

- The UI keeps optimistic cache state locally, while all persistence flows through the REST API. Data is durable in SQLite and shared between browsers immediately.
- Claim collisions honour "first hero wins". Later claim attempts throw and surface a toast.
- The repository abstraction now wraps HTTP calls, making it straightforward to reuse the same types on the client and server.

## Testing & quality

- Unit tests cover scoring multipliers, streak logic, recurrence scheduling, and claim conflict handling. Supertest drives API-level scenarios to ensure bootstrap and PIN enforcement stay intact.
- Accessibility is built-in with keyboard focus rings, labelled controls, and AA-compliant contrast.
- Vitest runs in jsdom for UI modules and automatically switches to a Node runtime for `server/**` tests.

## Progressive Web App

- `npm run build` generates a service worker and manifest via `vite-plugin-pwa`.
- Install prompts appear on supporting browsers; icons are provided for iOS and Android.
- The app caches shell assets and keeps optimistic UI state locally while the API provides durable persistence when connectivity returns.

## Seed data

Seeding is optional when running against a clean database—the unauthenticated `POST /users` bootstrap flow covers manual setup. The seed loader (`useSeedData`) creates:

- 4 example users (Ava, Milo, Nova, Zen) with emoji avatars.
- 12 quest templates spanning all recurrence types with lore-rich flavour text.

Delete the SQLite file or call `DELETE FROM users` to re-run the seeding process end-to-end.

## Folder overview

```
src/
  components/        Shared UI widgets (cards, filters, dialogs)
  data/              REST repository, seeds, tests
  features/          Domain-specific UI like the card editor
  hooks/             React Query hooks and helpers
  lib/               Utility modules for scoring, streaks, query client
  pages/             Route components (feed, history, leaderboard, settings, editor)
  pwa/               (reserved for future sync workers)
  types.ts           Core domain models
  server/            Express API, routes, database access, OpenAPI spec
```

Enjoy turning chores into epic household quests! 🛡️
