# Chore Quest Tracker

A minimal FastAPI prototype for tracking daily chores, completions, and cash rewards derived from a shared weekly pool.

## Features

- Define reusable chore templates with a difficulty-based percentage of the weekly pool.
- Start new weeks with a base cash pool plus any bonus carried forward from prior unclaimed chores.
- Distribute a fresh set of chores each day using the active templates.
- Members can complete chores and automatically receive the associated cash value deducted from the weekly pool.
- At the end of each day, uncompleted chore rewards are rolled into a bonus for the next week.

## Requirements

- Python 3.11+

Install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Running the API server

```bash
uvicorn app.main:app --reload
```

The interactive API docs will be available at http://127.0.0.1:8000/docs when the server is running.

## Typical workflow

1. **Create chore templates**

   ```bash
   curl -X POST http://127.0.0.1:8000/templates \
        -H "Content-Type: application/json" \
        -d '{"name": "Dishes", "difficulty_percentage": 10}'
   ```

2. **Start a new week**

   ```bash
   curl -X POST http://127.0.0.1:8000/weeks/start \
        -H "Content-Type: application/json" \
        -d '{"week_start": "2024-01-01", "base_amount": 200}'
   ```

3. **Distribute today's chores**

   ```bash
   curl -X POST http://127.0.0.1:8000/chores/distribute \
        -H "Content-Type: application/json" \
        -d '{"date": "2024-01-01"}'
   ```

4. **List available chores**

   ```bash
   curl http://127.0.0.1:8000/chores?target_date=2024-01-01
   ```

5. **Complete a chore**

   ```bash
   curl -X POST http://127.0.0.1:8000/chores/1/complete \
        -H "Content-Type: application/json" \
        -d '{"member_name": "Alex"}'
   ```

6. **Rollover uncompleted chores into next week's bonus**

   ```bash
   curl -X POST http://127.0.0.1:8000/chores/rollover \
        -H "Content-Type: application/json" \
        -d '{"date": "2024-01-01"}'
   ```

The rolled over total will automatically be applied the next time a week is started.
