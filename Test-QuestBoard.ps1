[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$ForceInstall,
    [switch]$SkipLint,
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
        Write-Host 'Installing workspace dependencies (npm install).' -ForegroundColor Cyan
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE."
        }
    }

    $tasks = @()

    if (-not $SkipLint -and -not $BackendOnly) {
        $tasks += @{
            Description = 'ESLint'
            Action = { npm run lint }
        }
    } elseif (-not $SkipLint -and $BackendOnly) {
        Write-Host 'Skipping ESLint because -BackendOnly was specified.' -ForegroundColor Yellow
    }

    if ($FrontendOnly) {
        $tasks += @{
            Description = 'Frontend tests'
            Action = { npm run test:frontend }
        }
    } elseif ($BackendOnly) {
        $tasks += @{
            Description = 'Backend tests'
            Action = { npm run test:backend }
        }
    } else {
        $tasks += @{
            Description = 'Full test suite'
            Action = { npm run test }
        }
    }

    if (-not $tasks) {
        Write-Host 'Nothing to run. Use -SkipLint together with -BackendOnly only if you know what you are doing.' -ForegroundColor Yellow
        return
    }

    foreach ($task in $tasks) {
        Write-Host "Running $($task.Description)..." -ForegroundColor Cyan
        & $task.Action
        if ($LASTEXITCODE -ne 0) {
            throw "$($task.Description) failed with exit code $LASTEXITCODE."
        }
    }

    Write-Host 'All requested checks completed successfully.' -ForegroundColor Green
}
finally {
    Pop-Location
}
