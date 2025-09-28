# ChoreQuest Tracker

ChoreQuest Tracker is a gamified daily chore web app inspired by gacha-style quest decks. Each new day flips a fresh set of collectible chore cards. Drawing a card reveals a hidden reward, and completing the task pops the reward into your balance. Unclaimed rewards stay banked until the next cycle, ensuring nothing goes to waste.

## Key Features

- **Daily quest deck** – Five randomized chore cards drawn from a curated library each day.
- **Hidden rewards** – Rewards are assigned from a pre-generated cycle pool and stay hidden until you flip a card.
- **Cycle management** – Seven-day cycles automatically roll over with unclaimed rewards carried forward.
- **Progress tracking** – Track total earned, cashed out, and rollover balances.
- **Animated rewards** – Claiming a chore triggers a celebratory pop-up so you feel the win.
- **Local persistence** – Progress is saved in `localStorage` so the deck is waiting when you return.

## Getting Started

```bash
npm install
npm run dev
```

The development server runs on [http://localhost:5173](http://localhost:5173) by default. Use `npm run dev -- --host 0.0.0.0 --port 4173` when running inside the CaaS environment.

## Production Build

```bash
npm run build
npm run preview
```

The build output is written to `dist/` and can be served by any static file host.

## Project Structure

- `src/App.tsx` – Main UI and game state logic.
- `src/data/choreLibrary.ts` – Pool of quest card templates.
- `src/types.ts` – Shared TypeScript types for cycles and chores.
- `src/utils/` – Helper functions for randomization, date math, and persistence.

Feel free to expand the chore library, tweak reward pools, or drop in real authentication to turn this prototype into your own productivity game.
