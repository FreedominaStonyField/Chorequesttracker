# QuestBoard

QuestBoard is a mobile-first React + TypeScript progressive web app that turns recurring family chores into collectible quest cards. It runs completely offline with IndexedDB storage, synchronises through a repository abstraction, and is ready to hook up to an API when needed.

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

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser. The seed loader populates four demo users and twelve chore templates on first launch.

### Available scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the built app |
| `npm run lint` | Run ESLint over the project |
| `npm run test` | Execute the Vitest unit test suite |
| `npm run test:coverage` | Run tests with coverage reporting |

## Offline & sync notes

- All mutations optimistically write to Dexie via the repository. React Query keeps the UI responsive offline.
- Claim collisions honour "first hero wins". Later claim attempts throw and surface a toast.
- A `SyncEnvelope` type and repository abstraction leave room for wiring in a real API/sync queue.

## Testing & quality

- Unit tests cover scoring multipliers, streak logic, recurrence scheduling, and claim conflict handling with fake-indexeddb.
- Accessibility is built-in with keyboard focus rings, labelled controls, and AA-compliant contrast.
- Vitest runs in a jsdom environment with jest-dom assertions.

## Progressive Web App

- `npm run build` generates a service worker and manifest via `vite-plugin-pwa`.
- Install prompts appear on supporting browsers; icons are provided for iOS and Android.
- The app caches shell assets and persists quest data in IndexedDB for full offline usage.

## Seed data

The seed loader (`useSeedData`) creates:

- 4 example users (Ava, Milo, Nova, Zen) with emoji avatars.
- Seeded users start without a PIN so the roster is unlocked by default; add one later from **Settings → Household PIN** if desired.
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
```

Enjoy turning chores into epic household quests! 🛡️
