# QuestBoard

QuestBoard is a mobile-first React + TypeScript progressive web app that turns recurring family chores into collectible quest cards. It now ships with a Node.js + Express backend that persists data to SQLite and streams quest updates to connected clients through Socket.IO.

## Features

- 📋 **Quest Feed** – Claim, complete, or craft new quest cards with tactile tiles, difficulty frames, and recurrence filters.
- 🕒 **Automated recurrence** – Daily, weekly, monthly, and one-time templates spawn instances at local midnight with configurable anchors.
- 🧾 **My Pile history** – Timeline of every completion with export to CSV/JSON plus filter by tag, difficulty, recurrence, or date range.
- 🛠️ **Template forge** – Create, duplicate, activate/deactivate, or bulk-edit quest templates with live previews.
- 🧑‍🤝‍🧑 **Roster management** – Add users with avatars, colours, and optional household PINs; adult guardians can manage everything.
- 🏆 **Leaderboard** – Weekly, monthly, and all-time scoreboards with tie-breaking by completions and earliest turn-ins.
- 🔔 **Gamification** – Difficulty multipliers, streak tracking, badge unlocks, and rotating quest completion flavour lines.
- 📱 **PWA ready** – Installable on iOS/Android/desktop with offline create/claim/complete flows powered by React Query + Dexie.
- ♿ **Accessibility** – High-contrast palette, focus-visible styles, semantic labelling, and screen-reader friendly copy.

## Tech stack

- React 19 + TypeScript, Vite, TailwindCSS
- State/data: React Query, Jotai, Dexie (IndexedDB) with repository abstraction
- Testing: Vitest, Testing Library, fake-indexeddb for Dexie unit tests
- PWA tooling: vite-plugin-pwa, custom icons, offline-first service worker
- Backend: Express, better-sqlite3 (SQLite), Socket.IO, Vitest

## Getting started

```bash
npm install
npm run dev # Frontend on http://localhost:5173
npm --prefix server run backend:dev # Backend on http://localhost:4000
```

The repository is configured as an npm workspace, so the server dependencies are installed automatically when you run `npm install` at the root.

Open http://localhost:5173 in your browser. The seed loader populates four demo users and twelve chore templates on first launch, while the backend seeds the same data in SQLite for API-backed persistence.

### Manual verification

1. Start the backend with `npm --prefix server run backend:dev` (http://localhost:4000) and the frontend with `npm run dev` (http://localhost:5173).
2. Open QuestBoard in two browser windows and select the same household hero in each.
3. In the first window, claim and complete a quest from the feed.
4. Observe the second window update in real-time as the completion notification arrives via Socket.IO and the React Query cache refreshes automatically.

### Available scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the built app |
| `npm run lint` | Run ESLint over the project |
| `npm run test` | Run frontend and backend test suites |
| `npm run test:frontend` | Execute the frontend Vitest unit tests |
| `npm run test:backend` | Execute the backend Vitest suite |
| `npm run test:coverage` | Run tests with coverage reporting |

## Offline & sync notes

- All mutations optimistically write to Dexie via the repository. React Query keeps the UI responsive offline.
- Claim collisions honour "first hero wins". Later claim attempts throw and surface a toast.
- A `SyncEnvelope` type and repository abstraction leave room for wiring in a real API/sync queue.

## Testing & quality

- Unit tests cover scoring multipliers, streak logic, recurrence scheduling, and claim conflict handling with fake-indexeddb.
- Backend Vitest specs spin up the Express + Socket.IO server to ensure realtime quest events broadcast between clients.
- Accessibility is built-in with keyboard focus rings, labelled controls, and AA-compliant contrast.
- Vitest runs in a jsdom environment with jest-dom assertions.

## Progressive Web App

- `npm run build` generates a service worker and manifest via `vite-plugin-pwa`.
- Install prompts appear on supporting browsers; icons are provided for iOS and Android.
- The app caches shell assets and persists quest data in IndexedDB for full offline usage.

## Seed data

The seed loader (`useSeedData`) creates:

- 4 example users (Ava, Milo, Nova, Zen) with emoji avatars.
- 12 quest templates spanning all recurrence types with lore-rich flavour text.

Delete browser storage to re-run the seeding process.

## Folder overview

```
src/
  components/        Shared UI widgets (cards, filters, dialogs)
  data/              Dexie database, repository, seeds, tests
  features/          Domain-specific UI like the card editor
  hooks/             React Query hooks and helpers
  lib/               Utility modules for scoring, streaks, query client
  pages/             Route components (feed, history, leaderboard, settings, editor)
  pwa/               (reserved for future sync workers)
  types.ts           Core domain models
shared/
  types/             Shared domain models for client and server
  seeds/             Seed data shared across runtimes
server/
  src/               Express API, repository, realtime gateway
  tests/             Vitest coverage for backend realtime behaviour
```

Enjoy turning chores into epic household quests! 🛡️
