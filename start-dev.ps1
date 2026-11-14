param(
    [switch] $SeedDemo
)

$ErrorActionPreference = 'Stop'
$backendPath = Join-Path $PSScriptRoot 'backend'
$frontendPath = Join-Path $PSScriptRoot 'frontend'
$backendEnvPath = Join-Path $backendPath '.env'
$frontendEnvPath = Join-Path $frontendPath '.env'

function Invoke-BackendArtisan {
    param([string[]] $Arguments)

    Push-Location $backendPath
    try {
        & php artisan @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "php artisan $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
    }
}

function Get-EnvValue {
    param(
        [string] $Path,
        [string] $Name
    )

    $match = Select-String -Path $Path -Pattern "^$Name=" | Select-Object -First 1
    if ($null -eq $match) {
        return ''
    }

    return ($match.Line.Substring($Name.Length + 1)).Trim().Trim('"').Trim("'")
}

function Test-ListeningPort {
    param([int] $Port)

    return $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Wait-ForEndpoint {
    param(
        [string] $Url,
        [string] $Description
    )

    $deadline = (Get-Date).AddSeconds(30)
    do {
        try {
            $response = Invoke-RestMethod -Uri $Url -TimeoutSec 2
            if ($Url.EndsWith('/api/health') -and $response.status -ne 'ok') {
                throw "$Description returned an unexpected health response."
            }

            return
        } catch {
            if ((Get-Date) -ge $deadline) {
                throw "$Description did not become ready at $Url. Check its terminal window for errors. $($_.Exception.Message)"
            }

            Start-Sleep -Seconds 1
        }
    } while ((Get-Date) -lt $deadline)
}

if (-not (Get-Command php -ErrorAction SilentlyContinue)) {
    throw 'PHP is not available in PATH. Start Laragon or add PHP to PATH, then run this script again.'
}
if (-not (Test-Path (Join-Path $backendPath 'vendor\autoload.php'))) {
    throw 'Backend dependencies are missing. Run composer install from backend first.'
}
if (-not (Test-Path (Join-Path $frontendPath 'node_modules\vite\bin\vite.js'))) {
    throw 'Frontend dependencies are missing. Run npm ci from frontend first.'
}

if (-not (Test-Path $backendEnvPath)) {
    Copy-Item (Join-Path $backendPath '.env.example') $backendEnvPath
}
if (-not (Test-Path $frontendEnvPath)) {
    Copy-Item (Join-Path $frontendPath '.env.example') $frontendEnvPath
}

$databaseConnection = Get-EnvValue -Path $backendEnvPath -Name 'DB_CONNECTION'
if ($databaseConnection -ne 'sqlite') {
    throw "Expected DB_CONNECTION=sqlite in backend\.env; found '$databaseConnection'."
}

$databaseName = Get-EnvValue -Path $backendEnvPath -Name 'DB_DATABASE'
if ([string]::IsNullOrWhiteSpace($databaseName)) {
    throw 'DB_DATABASE is empty in backend\.env.'
}

if ([System.IO.Path]::IsPathRooted($databaseName)) {
    $databasePath = $databaseName
} else {
    $databasePath = Join-Path $backendPath $databaseName
}

$databaseDirectory = Split-Path -Parent $databasePath
if (-not (Test-Path $databaseDirectory)) {
    New-Item -ItemType Directory -Path $databaseDirectory -Force | Out-Null
}
if (-not (Test-Path $databasePath)) {
    New-Item -ItemType File -Path $databasePath | Out-Null
}

$applicationKey = Get-EnvValue -Path $backendEnvPath -Name 'APP_KEY'
if ([string]::IsNullOrWhiteSpace($applicationKey)) {
    Invoke-BackendArtisan -Arguments @('key:generate', '--force')
}

Invoke-BackendArtisan -Arguments @('config:clear')
Invoke-BackendArtisan -Arguments @('migrate', '--force')

if ($SeedDemo) {
    Invoke-BackendArtisan -Arguments @('db:seed', '--force')
}

if (Test-ListeningPort -Port 8000) {
    Wait-ForEndpoint -Url 'http://127.0.0.1:8000/api/health' -Description 'Backend API'
    Write-Host 'Backend API already running on port 8000.'
} else {
    Start-Process -FilePath 'powershell.exe' `
        -WorkingDirectory $backendPath `
        -ArgumentList @('-NoExit', '-Command', 'php artisan serve --host=127.0.0.1 --port=8000') | Out-Null
    Wait-ForEndpoint -Url 'http://127.0.0.1:8000/api/health' -Description 'Backend API'
    Write-Host 'Backend API started on port 8000.'
}

if (Test-ListeningPort -Port 5173) {
    Wait-ForEndpoint -Url 'http://127.0.0.1:5173/api/health' -Description 'Frontend and API proxy'
    Write-Host 'Frontend already running on port 5173.'
} else {
    Start-Process -FilePath $env:ComSpec `
        -WorkingDirectory $frontendPath `
        -ArgumentList @('/k', 'npm run dev -- --host 0.0.0.0 --port 5173') | Out-Null
    Wait-ForEndpoint -Url 'http://127.0.0.1:5173/api/health' -Description 'Frontend and API proxy'
    Write-Host 'Frontend started on port 5173.'
}

Write-Host ''
Write-Host 'Open http://localhost:5173/login to register or sign in.'
if ($SeedDemo) {
    Write-Host 'Demo accounts: admin@example.com and member@example.com.'
    Write-Host 'Demo password: Taskflow-Local-2026!'
}
