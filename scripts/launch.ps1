$ErrorActionPreference = "Stop"

$hostAddress = $Env:HOST
if (-not $hostAddress) { $hostAddress = "0.0.0.0" }

$port = $Env:PORT
if (-not $port) { $port = "8000" }

$venvActivate = Join-Path ".venv" "Scripts/Activate.ps1"
if (Test-Path $venvActivate) {
    . $venvActivate
}

uvicorn app.main:app --host $hostAddress --port $port
