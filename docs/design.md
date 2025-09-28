# Chore Quest Tracker — Product & System Design

## 1. Product Vision
Chore Quest Tracker is a single-user mobile and web application that transforms routine chores into collectible quests. Each day the user draws chore cards that reveal hidden rewards once flipped. Completing chores grants gamified pop-up rewards while unclaimed loot rolls into the next reward cycle, providing long-term motivation.

## 2. Personas & Use Cases
- **Primary persona: Solo household manager** who needs a playful nudge to keep up with recurring chores (dishes, laundry, trash).
- **Secondary persona: Roommate or family member** using a shared account to motivate communal tasks.

Use cases include:
1. Draw daily quest cards and reveal hidden rewards.
2. Complete chores to claim randomized payouts with celebratory animations.
3. Track lifetime earnings, current balance, and cash-outs.
4. Review history of completed quests and rollover loot between cycles.

## 3. Core Concepts
- **Chore Card**: Represents a quest with title, description, estimated effort, optional icon, and hidden reward value. Each card is drawn daily from the chore pool.
- **Cycle**: Configurable period (default weekly) during which a reward pool is pre-calculated and allocated to chores. Cycles maintain metadata such as start/end timestamps, total reward budget, and rollover amount from previous cycles.
- **Reward Pool**: Currency, points, or tokens generated at cycle start. After daily refresh, unclaimed rewards return to the pool and carry forward to the next cycle.
- **Daily Refresh**: At a scheduled time (e.g., midnight local time) the app generates a new set of chore cards from the user’s chore catalog. Each card receives a hidden reward drawn from the remaining pool while respecting min/max constraints.
- **Progress Tracking**: The user profile records totals for `earned`, `cashed_out`, and `unclaimed_rollover` alongside detailed quest completion history.

## 4. User Flow
1. **Cycle creation**
   - At the beginning of a cycle, the system calculates a reward pool based on configurable inputs (base budget, streak bonuses, sponsorships, rollover).
   - The pool is partitioned into daily allocations that act as upper bounds for each refresh.
2. **Daily login**
   - User sees a deck of face-down chore cards with limited draws or all cards revealed for the day.
   - Tapping a card flips it, reveals the chore details, and shows the hidden reward with a gacha-style animation.
3. **Quest completion**
   - When the user confirms completion, a pop-up animation displays the reward payout and adds it to the user’s earned total.
   - Claimed rewards are deducted from the day’s allocation and the cycle’s pool.
4. **End of day**
   - Any unclaimed cards return their hidden values to the remaining pool.
   - Next refresh seeds a new deck using the updated pool.
5. **Cash out**
   - The user can convert earned points into external value (gift cards, currency) and the app records `cashed_out` amounts while reducing the available balance.

## 5. Reward Allocation Algorithm
1. Determine the cycle’s total reward pool `R_cycle`.
2. Split `R_cycle` into daily budgets `R_day` using weighting (e.g., weekend bonus multipliers).
3. For each refresh, generate `n` chore cards from the chore catalog (weighted by priority, overdue status, or streaks).
4. Randomly assign rewards to cards:
   - Use gacha rarity tiers (e.g., Common 50%, Rare 35%, Epic 12%, Legendary 3%) mapped to reward ranges.
   - Ensure the sum of assigned rewards does not exceed `R_day`.
   - Enforce a minimum reward per card to avoid zero payouts.
5. Track unclaimed reward total `U_day`. At day end, add `U_day` back into the cycle pool. At cycle end, any remaining value becomes `rollover_next_cycle`.

## 6. Data Model (simplified)
```text
UserProfile
- user_id
- display_name
- total_earned
- total_cashed_out
- unclaimed_rollover
- current_balance (derived: total_earned - total_cashed_out)

Cycle
- cycle_id
- start_at, end_at
- base_pool
- rollover_in
- total_pool (base_pool + rollover_in)
- rollover_out

DailyQuestSet
- quest_set_id
- cycle_id
- date
- total_budget
- unclaimed_value

ChoreCatalogItem
- chore_id
- name
- description
- effort_level
- frequency
- icon

QuestCard
- card_id
- quest_set_id
- chore_id
- rarity
- reward_value
- revealed_at
- completed_at
- status (pending, completed, expired)

RewardTransaction
- transaction_id
- card_id
- user_id
- amount
- type (earn, cash_out)
- created_at
```

## 7. System Architecture
- **Frontend**: React Native (mobile) + responsive web (React/Next.js) sharing component library. Features include card deck UI, animations, progress dashboard, and history timeline.
- **Backend**: Node.js (NestJS) or Python (FastAPI) service managing chore catalog, reward logic, and persistence. Provides REST/GraphQL APIs for quest generation, completion, and account stats.
- **Database**: PostgreSQL for relational data; Redis for caching reward pools and scheduling jobs.
- **Scheduler**: Background worker (Bull queue / Celery) that triggers daily refresh, cycle transitions, and handles reward rollovers.
- **Authentication**: Single-user or optional OAuth for multi-device access.
- **Analytics**: Event tracking to measure streaks, completion rates, and reward distribution fairness.

## 8. Pop-up & Animation Design
- Flip animation mimics card packs with easing curve and particle effects.
- Reward pop-up includes animated coin burst, confetti, and textual recap of amount earned.
- Completed cards move to a "Victory" stack with a glow effect; partial completion indicator for in-progress chores.

## 9. Gamification & Retention Mechanics
- **Streak bonuses**: Additional reward multipliers for consecutive completion days.
- **Quest modifiers**: Random boosters (double reward, time-limited, surprise mini-games).
- **Progression**: Leveling system tied to total earned; unlocks new card art and chore themes.
- **Shop & Cosmetics**: Use tokens for cosmetic upgrades or real-world rewards.
- **Notifications**: Push reminders for unclaimed quests and cycle rollover events.

## 10. Security & Fairness Considerations
- Server-side reward assignment to prevent tampering.
- Audit log of transactions and quest completions.
- Anti-cheat measures (e.g., proof-of-completion prompts, photo evidence toggles).
- Rate limits and checksum verification on completion requests.

## 11. Future Enhancements
- Cooperative multiplayer cycles with shared pools.
- Integration with smart home devices for automatic chore verification.
- Dynamic difficulty based on user availability.
- Seasonal events offering limited-time chore themes and rewards.

## 12. Success Metrics
- Daily active users, quests completed per day, rollover size trend.
- Average reward claimed vs. unclaimed.
- Retention: 7-day/30-day return rates.
- Cash-out frequency and satisfaction survey scores.

