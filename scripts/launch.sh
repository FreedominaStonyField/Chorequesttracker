#!/usr/bin/env bash
set -euo pipefail

HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8000}
VENV_DIR=".venv"

if [ -d "$VENV_DIR" ]; then
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
fi

exec uvicorn app.main:app --host "$HOST" --port "$PORT"
