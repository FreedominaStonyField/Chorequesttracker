[CmdletBinding()]
param(
    [string]$Address,
    [int]$FrontendPort = 5173,
    [int]$BackendPort = 4000,
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

function Get-LanAddressPreference {
    param(
        [string]$IPAddress
    )

    if ($IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)') {
        return 0
    }

    if ($IPAddress -match '^100\.') {
        return 2
    }

    return 1
}

function Get-IPv4Candidates {
    $candidates = @()

    try {
        $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object {
            $_.IPAddress -notlike '127.*' -and
            $_.IPAddress -notlike '169.254*' -and
            $_.InterfaceOperationalStatus -eq 'Up'
        } | ForEach-Object {
            $originRank = switch ($_.PrefixOrigin) {
                'Dhcp' { 0 }
                'Manual' { 1 }
                'WellKnown' { 2 }
                default { 3 }
            }
            [PSCustomObject]@{
                IPAddress       = $_.IPAddress
                InterfaceAlias  = $_.InterfaceAlias
                PrefixOrigin    = $_.PrefixOrigin
                InterfaceMetric = $_.InterfaceMetric
                PrefixLength    = $_.PrefixLength
                Preference      = Get-LanAddressPreference -IPAddress $_.IPAddress
                Source          = 'Get-NetIPAddress'
                OriginRank      = $originRank
            }
        }
    } catch {
        # Ignore and fall back to ipconfig parsing below.
    }

    if (-not $candidates) {
        $matches = ipconfig | Select-String -Pattern 'IPv4 Address.*: (?<ip>\d+\.\d+\.\d+\.\d+)'
        if ($matches) {
            $candidates = $matches | ForEach-Object {
                $ip = $_.Matches[0].Groups['ip'].Value
                [PSCustomObject]@{
                    IPAddress       = $ip
                    InterfaceAlias  = $null
                    PrefixOrigin    = 'Unknown'
                    InterfaceMetric = [int]::MaxValue
                    PrefixLength    = 0
                    Preference      = Get-LanAddressPreference -IPAddress $ip
                    Source          = 'ipconfig'
                    OriginRank      = 4
                }
            }
        }
    }

    return $candidates |
        Where-Object { $_.IPAddress } |
        Sort-Object -Property Preference, OriginRank, InterfaceMetric, PrefixLength |
        Group-Object -Property IPAddress |
        ForEach-Object { $_.Group | Select-Object -First 1 }
}

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

    if ($Address) {
        $targetAddress = $Address
        $selectedPreference = Get-LanAddressPreference -IPAddress $targetAddress
        $alternatives = @()
    } else {
        $candidates = Get-IPv4Candidates
        if (-not $candidates) {
            throw 'Unable to determine a LAN IPv4 address. Specify one via -Address.'
        }

        $primary = $candidates | Select-Object -First 1
        $targetAddress = $primary.IPAddress
        $selectedPreference = $primary.Preference
        $alternatives = $candidates | Select-Object -Skip 1 | Select-Object -ExpandProperty IPAddress
    }

    if ($alternatives) {
        Write-Host ('Other detected IPv4 addresses: {0}. Use -Address to target one of them.' -f ($alternatives -join ', ')) -ForegroundColor Yellow
    }

    if ($selectedPreference -gt 0) {
        Write-Host 'Selected address is outside typical private LAN ranges; confirm it is reachable by your testers or override with -Address.' -ForegroundColor Yellow
    }

    $apiBaseUrl = "http://{0}:{1}/api" -f $targetAddress, $BackendPort
    $frontendOrigin = "http://{0}:{1}" -f $targetAddress, $FrontendPort

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

    Write-Host "Serving over LAN using $targetAddress" -ForegroundColor Cyan
    Write-Host ("Frontend: {0}" -f $frontendOrigin) -ForegroundColor Cyan
    if (-not $FrontendOnly) {
        Write-Host ("API: {0}" -f $apiBaseUrl) -ForegroundColor Cyan
    }

    $escapedRoot = $rootPath.Replace("'", "''")

    if (-not $BackendOnly) {
        Write-Host 'Starting frontend dev server for LAN testing in a new PowerShell window.' -ForegroundColor Cyan
        $viteHost = $targetAddress
        $frontendCommand = "Set-Location -LiteralPath '{0}'; `\$env:VITE_API_BASE_URL='{1}'; `\$env:HOST='{2}'; npm run dev -- --host '{2}' --port {3} --strictPort --origin '{4}'" -f $escapedRoot, $apiBaseUrl, $viteHost, $FrontendPort, $frontendOrigin
        $frontendArgs = @('-NoExit', '-Command', $frontendCommand)
        Start-Process -FilePath $shellCandidate -ArgumentList $frontendArgs -WorkingDirectory $rootPath | Out-Null
    }

    if (-not $FrontendOnly) {
        Write-Host 'Starting backend dev server for LAN testing in a new PowerShell window.' -ForegroundColor Cyan
        $backendArgs = @(
            '-NoExit',
            '-Command',
            "Set-Location -LiteralPath '$escapedRoot'; `$env:PORT=$BackendPort; npm --prefix server run backend:dev"
        )
        Start-Process -FilePath $shellCandidate -ArgumentList $backendArgs -WorkingDirectory $rootPath | Out-Null
    }

    if (-not $BackendOnly -and -not $FrontendOnly) {
        Write-Host 'Frontend and backend are running for LAN access.' -ForegroundColor Green
    } elseif (-not $FrontendOnly) {
        Write-Host 'Backend dev server launched for LAN access.' -ForegroundColor Green
    } elseif (-not $BackendOnly) {
        Write-Host 'Frontend dev server launched for LAN access.' -ForegroundColor Green
    }

    Write-Host ''
    Write-Host 'Share the printed URLs with testers on your local network.' -ForegroundColor Gray
    Write-Host 'If devices cannot connect, allow node/npm through Windows Defender Firewall or run the terminals as administrator once to grant access.' -ForegroundColor Yellow
}
finally {
    Pop-Location
}
