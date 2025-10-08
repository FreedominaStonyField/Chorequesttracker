[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$ForceInstall,
    [switch]$FrontendOnly,
    [switch]$BackendOnly
)

if ($FrontendOnly -and $BackendOnly) {
    throw 'Specify either -FrontendOnly or -BackendOnly, not both.'
}

if ($SkipInstall -and $ForceInstall) {
    throw 'Choose either -SkipInstall or -ForceInstall.'
}

$ErrorActionPreference = 'Stop'

$rootPath = Split-Path -Path $MyInvocation.MyCommand.Path -Parent

if (-not $rootPath) {
    $rootPath = Get-Location
}

Push-Location -LiteralPath $rootPath

try {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmCommand) {
        throw 'npm is not available on PATH. Install Node.js 20+ and ensure npm is accessible.'
    }

    $shouldInstall = $true
    if ($SkipInstall) {
        $shouldInstall = $false
        Write-Host 'Skipping dependency installation (per -SkipInstall).' -ForegroundColor Yellow
    } elseif (-not $ForceInstall) {
        $rootNodeModules = Test-Path -LiteralPath (Join-Path $rootPath 'node_modules')
        $serverNodeModules = Test-Path -LiteralPath (Join-Path $rootPath 'server\node_modules')

        if ($rootNodeModules -and $serverNodeModules) {
            $shouldInstall = $false
            Write-Host 'Detected existing node_modules; skipping npm install. Use -ForceInstall to reinstall.' -ForegroundColor Yellow
        }
    }

    if ($shouldInstall) {
        Write-Host 'Installing workspace dependencies (npm install)…' -ForegroundColor Cyan
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE."
        }
    }

    $shellCandidate = $null
    foreach ($candidate in @('pwsh', 'powershell')) {
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($cmd) {
            $shellCandidate = $cmd.Source
            break
        }
    }

    if (-not $shellCandidate) {
        throw 'Unable to locate pwsh.exe or powershell.exe to launch child consoles.'
    }

    $escapedRoot = $rootPath.Replace("'", "''")

    if (-not $BackendOnly) {
        Write-Host 'Starting frontend dev server in a new PowerShell window…' -ForegroundColor Cyan
        $frontendArgs = @(
            '-NoExit',
            '-Command',
            "Set-Location -LiteralPath '$escapedRoot'; npm run dev"
        )
        Start-Process -FilePath $shellCandidate -ArgumentList $frontendArgs -WorkingDirectory $rootPath | Out-Null
    }

    if (-not $FrontendOnly) {
        Write-Host 'Starting backend dev server in a new PowerShell window…' -ForegroundColor Cyan
        $backendArgs = @(
            '-NoExit',
            '-Command',
            "Set-Location -LiteralPath '$escapedRoot'; npm --prefix server run backend:dev"
        )
        Start-Process -FilePath $shellCandidate -ArgumentList $backendArgs -WorkingDirectory $rootPath | Out-Null
    }

    if (-not $BackendOnly -and -not $FrontendOnly) {
        Write-Host 'Frontend (Vite) and backend (Express) are running in their own terminals.' -ForegroundColor Green
    } elseif (-not $FrontendOnly) {
        Write-Host 'Backend dev server launched.' -ForegroundColor Green
    } elseif (-not $BackendOnly) {
        Write-Host 'Frontend dev server launched.' -ForegroundColor Green
    }

    Write-Host ''
    Write-Host 'Close this bootstrap window when you no longer need it; the dev servers keep running separately.' -ForegroundColor Gray
}
finally {
    Pop-Location
}
