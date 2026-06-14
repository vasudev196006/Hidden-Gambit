# Helper script to run local environment for Hidden Gambit chess game

if (-not (Test-Path .env)) {
    Write-Host "----------------------------------------------------------------------" -ForegroundColor Red
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.example to .env and set your DATABASE_URL." -ForegroundColor Yellow
    Write-Host "Example: Copy-Item .env.example .env" -ForegroundColor Yellow
    Write-Host "----------------------------------------------------------------------" -ForegroundColor Red
    Exit
}

# Load environment variables from .env
Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan
Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line -match '^(?<name>[^=]+)=(?<value>.*)$') {
        $name = $Matches['name'].Trim()
        $value = $Matches['value'].Trim()
        # Remove surrounding quotes if they exist
        if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") {
            $value = $Matches[1]
        }
        [System.Environment]::SetEnvironmentVariable($name, $value, [System.EnvironmentVariableTarget]::Process)
    }
}

if (-not $env:DATABASE_URL -or $env:DATABASE_URL.Contains("user:password")) {
    Write-Host "----------------------------------------------------------------------" -ForegroundColor Red
    Write-Host "Error: DATABASE_URL is not set or still contains placeholders." -ForegroundColor Red
    Write-Host "Please update your .env file with a valid PostgreSQL connection string." -ForegroundColor Yellow
    Write-Host "Get a free instance on https://neon.tech/ or https://supabase.com/" -ForegroundColor Yellow
    Write-Host "----------------------------------------------------------------------" -ForegroundColor Red
    Exit
}

# 1. Run Drizzle Push to update database schema
Write-Host "`nStep 1: Pushing database schema via Drizzle ORM..." -ForegroundColor Cyan
$pushResult = pnpm --filter @workspace/db run push
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nWarning: Drizzle push returned exit code $LASTEXITCODE. Database might not be fully synced or schema was already up-to-date." -ForegroundColor Yellow
} else {
    Write-Host "Database schema pushed successfully!" -ForegroundColor Green
}

# 2. Start API backend server in a new window
Write-Host "`nStep 2: Starting API server (backend) in a new window on port 5000..." -ForegroundColor Cyan
$apiCommand = "`$env:DATABASE_URL='$($env:DATABASE_URL)'; `$env:PORT='5000'; pnpm --filter @workspace/api-server run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiCommand

# 3. Start Frontend dev server in the current window
Write-Host "`nStep 3: Starting Vite dev server (frontend) in the current window on port 3000..." -ForegroundColor Cyan
Write-Host "Vite server will proxy '/api/*' and '/socket.io/*' requests to the API server on port 5000." -ForegroundColor Gray
$env:PORT = "3000"
$env:BASE_PATH = "/"
pnpm --filter @workspace/deception-chess run dev
