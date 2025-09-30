$ErrorActionPreference = "Stop"

$pythonCandidates = @("python", "python3", "py")
$python = $null
foreach ($candidate in $pythonCandidates) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
        $python = $candidate
        break
    }
}

if (-not $python) {
    Write-Error "Python is required but was not found in PATH. Install Python 3.11 or later."
}

$venvDir = ".venv"
if (-not (Test-Path $venvDir)) {
    & $python -m venv $venvDir
}

$activate = Join-Path $venvDir "Scripts/Activate.ps1"
. $activate

python -m pip install --upgrade pip
pip install -r requirements.txt

Write-Host "Environment ready. Activate it with:`n  . $activate"
