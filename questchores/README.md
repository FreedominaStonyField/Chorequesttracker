# QuestChores — Chore Tracker with Daily‑Quest Gacha Payouts

Prototype web app that turns chores into daily quests. It allocates a cash pool across a 28‑day cycle and pays out randomized rewards based on chore difficulty using a triangular distribution.

## Core Idea

* Set a **cycle**: start date, length (default 28 days), and a cash **pool** for the whole cycle.
* Enter **users** and **chores**. Each chore has `min/mode/max` values that shape its random payout.
* Log **completions** per day. Run **Allocate Payouts** to transform completions into payouts without exceeding that day’s budget.
* Track per‑user **total earned**, **total cashed out**, and **current balance**.

## Math and Allocation

* Deterministic RNG seeded with `config.seed` ensures repeatable “random” draws per day.
* **Daily budget** spreads the remaining pool across remaining days:
  `dailyBudget = floor2(remainingPool / remainingDays)`.
* For each completion *i*, draw `suggested_i = triangular(min, mode, max)`.
* Let `S = Σ suggested_i`. If `S <= dailyBudget`, pay each `suggested_i`.
* If `S > dailyBudget`, scale proportionally: `payout_i = suggested_i * (dailyBudget / S)`.
* Round to cents. Add payouts to users’ `totalEarned`.

**Why triangular?**

* You provide `min`, `mode` (the “mid” you wanted), and `max` per chore. The distribution is simple, bounded, and biased toward the mode. It allows rewarding harder chores with higher modes while keeping rare high spikes via `max`.

## Data Model

```ts
User { id, name, totalEarned, totalCashedOut }
Chore { id, title, recurrence, min, mode, max, active }
CycleConfig { cycleDays, cashPoolTotal, startDateISO, seed }
Completion { id, userId, choreId, dateISO }
Payout { completionId, amount, dateISO }
AppState { users[], chores[], config, completions[], payouts[] }
```

## Flows

1. **Setup**: Configure cycle and seed. Add users. Add chores with `min/mode/max`.
2. **Log Chores**: Pick a date. Click to add completions for user‑chore pairs.
3. **Allocate**: Press *Allocate Payouts*. The app calculates suggested amounts, scales if needed, writes payouts, and updates user totals.
4. **Cash Out**: From Users panel, cash out any amount up to the user’s balance. This increments `totalCashedOut` and leaves `totalEarned` intact for auditability.
5. **Import/Export**: Save or restore full state as JSON.

## Assumptions

* No authentication. Single browser stores the state.
* Daily allocation is idempotent. Re‑running allocation for the same day does not duplicate payouts.
* Remaining pool spreads itself automatically day by day due to the formula. No hard “use‑it‑or‑lose‑it”.

## Testing

* `triangular.test.ts`: min/max bounds and mode bias sanity checks.
* `allocation.test.ts`: verifies proportional scaling preserves ratios and matches daily budget within ±$0.01.

## Local Development

```
npm i
npm run dev
```

Open the local URL printed by Vite.

## Next Steps

* Multi‑device sync via a backend.
* Role‑based participants and approvals.
* Weekly or category caps.
* Analytics: completion streaks, fairness audits, and variance controls.

## Design Rationale (high‑level)

* **Spread first**: compute the daily budget from remaining pool divided by remaining days to avoid end‑loaded payouts.
* **Bounded randomness**: triangular(min, mode, max) gives controlled variance with intuitive knobs.
* **Determinism**: seeded RNG makes simulations repeatable for testing and fairness reviews.
* **Simple persistence**: `localStorage` keeps the prototype zero‑infrastructure.
