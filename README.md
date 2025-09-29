# ChoreQuest Tracker

ChoreQuest Tracker is a gamified daily chore web app inspired by gacha-style quest decks. Each new day flips a fresh set of collectible chore cards. Drawing a card reveals a hidden cash reward, and completing the task pops the payout into your balance. Unclaimed rewards stay banked until the next day, ensuring nothing goes to waste.

## Key Features

- **Daily quest deck** – Every chore card from the shared library appears for all players each day.
- **Hidden cash rewards** – Dollar values are pre-generated from the daily pool and stay secret until you flip a card.
- **Rollover management** – Unclaimed rewards automatically roll into the next day’s pool.
- **Profile switching** – Basic login swaps between Fransisco, Lewis, Jero, and Saffire with separate ledgers.
- **Progress tracking** – Track total cash earned, withdrawn, and rollover balances.
- **Animated rewards** – Claiming a chore triggers a celebratory pop-up so you feel the win.
- **Backend persistence** – Progress is stored in a SQLite database behind the new Express API so the deck survives refreshes and multi-device use.
- **Admin debug tools** – Run reward pool simulations and regenerate the daily deck to validate payouts.

## Getting Started

```bash
# Install front-end dependencies
npm install

# Install server dependencies and apply migrations
cd server
npm install
npx prisma migrate dev
cd ..

# Start both dev servers (API + Vite)
npm run dev:full
```

The Express API boots on port `4000` and the Vite dev server runs on port `5173`, both bound to `0.0.0.0` so you can test across devices.

Create a `.env` file at the repo root (or copy `.env.example`) so the client can reach the API:

```env
VITE_API_BASE_URL="http://localhost:4000/api"
VITE_API_TOKEN="dev-token"
```

The server reads its own `.env` (copied from `server/.env.example`) for `DATABASE_URL`, `API_TOKEN`, and `PORT` values.

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

## Admin Testing Toolkit

Open the **Admin Control Center** from the quest board to adjust chore templates and the reward pool. The new testing tools help
you verify pooling logic before pushing changes live:

- **Regenerate today's quests** to reshuffle rewards while keeping any carry-over budget intact.
- **Reset completion status** to clear claimed quests for the day without changing their rewards.
- **Start fresh cycle** to build a brand-new cycle that ignores previous carry-over.
- **Run pool simulation** to execute up to 500 randomized allocations using the current (or drafted) settings and review the
  minimum, average, and maximum rolls for each chore plus the leftover budget range.

Save any pending changes before running diagnostics to ensure the simulation matches the configuration you expect.

### Regression Check: Admin Regeneration

To confirm the reward pool stays bounded after repeated regenerations:

1. Open the Admin Control Center and note the configured reward pool value.
2. Without completing any chores, click **Regenerate today's quests** at least five times.
3. Flip a chore card after each regeneration and confirm the revealed reward never exceeds the configured pool.
4. Optionally complete a chore, regenerate again, and verify the remaining rewards match the leftover budget instead of gaining an extra base pool.

### Regression Check: Admin Draft Persistence

Ensure unsaved admin edits survive background synchronization:

1. Open the Admin Control Center and change both the reward pool and at least one chore percentage without saving.
2. Wait five minutes or switch to a different browser tab and return so the app triggers a background sync.
3. Confirm your drafted values remain in the form fields, and the **Save changes** button is still enabled until you save or discard.

### Regression Check: Local Day Boundaries

Verify the daily reset respects the player’s local time instead of UTC midnight:

1. Temporarily change your system clock (or use browser dev tools) to 11:55 PM local time and note today’s date in the Admin Control Center diagnostics.
2. Advance the clock past 12:05 AM local time and trigger a visibility change (switch tabs or reload).
3. Confirm the displayed “today” date updates only after the local midnight passes, and all players see the refreshed quest deck together.

Feel free to expand the chore library, tweak reward pools, or drop in real authentication to turn this prototype into your own productivity game.
