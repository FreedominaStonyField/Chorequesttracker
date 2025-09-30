@echo off
setlocal

if not "%HOST%"=="" (
    set "APP_HOST=%HOST%"
) else (
    set "APP_HOST=0.0.0.0"
)

if not "%PORT%"=="" (
    set "APP_PORT=%PORT%"
) else (
    set "APP_PORT=8000"
)

if exist ".venv\Scripts\activate" (
    call .venv\Scripts\activate
)

uvicorn app.main:app --host %APP_HOST% --port %APP_PORT%
