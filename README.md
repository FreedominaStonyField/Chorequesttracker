# Chore Quest Tracker

A FastAPI prototype for tracking daily chores, completions, and cash rewards derived from a shared weekly pool. This update ships a simple browser interface alongside the existing REST API so you can manage your chores without touching cURL.

## Features

- Define reusable chore templates with a difficulty-based percentage of the weekly pool.
- Start new weeks with a base cash pool plus any bonus carried forward from prior unclaimed chores.
- Distribute a fresh set of chores each day and record who completed them.
- At the end of each day, roll unclaimed rewards into next week's bonus.
- Manage everything from a built-in web UI at `http://localhost:8000/`.

## Quick start

> All scripts work from the repository root. Pick the variant that matches your environment.

### 1. Install dependencies

- **Git Bash / WSL / macOS / Linux**

  ```bash
  ./scripts/install.sh
  ```

- **Windows PowerShell**

  ```powershell
  ./scripts/install.ps1
  ```

- **Windows Command Prompt**

  ```cmd
  scripts\install.cmd
  ```

Each script creates a `.venv` virtual environment (if needed), upgrades `pip`, and installs the Python dependencies listed in `requirements.txt`.

### 2. Launch the server on your local network

- **Git Bash / WSL / macOS / Linux**

  ```bash
  ./scripts/launch.sh
  ```

- **Windows PowerShell**

  ```powershell
  ./scripts/launch.ps1
  ```

- **Windows Command Prompt**

  ```cmd
  scripts\launch.cmd
  ```

By default the FastAPI app binds to `0.0.0.0:8000`, making the interface available to other devices on the same network (e.g. `http://<your-ip>:8000/`). Set the `HOST` and/or `PORT` environment variables before running the launch script to customise the bind address.

## Using the web interface

Visit `http://localhost:8000/` (or the LAN address if you're sharing it). The dashboard lets you:

1. Start a week with a base amount—the rollover bonus is applied automatically.
2. Create chore templates tied to a percentage of the weekly pool.
3. Distribute chores for a selected day and review their status.
4. Assign completed chores to household members right from the list.
5. Rollover unclaimed chores into next week's bonus with a single click.

API documentation remains available at `http://localhost:8000/docs` for anyone who prefers direct REST access.
