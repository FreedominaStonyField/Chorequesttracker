@echo off
setlocal enabledelayedexpansion

set "PY_CMD="
for %%P in (py python python3) do (
    where %%P >nul 2>&1
    if not errorlevel 1 (
        set "PY_CMD=%%P"
        goto :found
    )
)

echo Python is required but was not found in PATH.
exit /b 1

:found
set "VENV=.venv"
if not exist "%VENV%" (
    %PY_CMD% -m venv "%VENV%"
)

call "%VENV%\Scripts\activate"
python -m pip install --upgrade pip
pip install -r requirements.txt

echo Environment ready. Activate it with: call %VENV%\Scripts\activate
