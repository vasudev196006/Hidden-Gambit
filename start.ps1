# start.ps1 - Starts the app without rebuilding (uses pre-built API dist)
# Uses fnm to activate Node 22 which is compatible with pnpm 11

# Load env vars
if (-not (Test-Path .env)) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    Exit
}
Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line -match '^(?<name>[^=]+)=(?<value>.*)$') {
        $name = $Matches['name'].Trim()
        $value = $Matches['value'].Trim()
        if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") { $value = $Matches[1] }
        [System.Environment]::SetEnvironmentVariable($name, $value, [System.EnvironmentVariableTarget]::Process)
    }
}

# Activate Node 22 via fnm
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
try {
    fnm env --use-on-cd --shell power-shell | Out-String | Invoke-Expression
    fnm use 22
    Write-Host "Node version: $(node --version)" -ForegroundColor Green
} catch {
    Write-Host "Warning: fnm not found or Node 22 not available. Using system Node." -ForegroundColor Yellow
}

# Start API server in background window (using pre-built dist - no rebuild needed)
Write-Host "`nStarting API server on port 5000 (using pre-built dist)..." -ForegroundColor Cyan
$fnmSetup = '$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); try { fnm env --use-on-cd --shell power-shell | Out-String | Invoke-Expression; fnm use 22 } catch {}'
$apiCommand = "$fnmSetup; `$env:DATABASE_URL='$($env:DATABASE_URL)'; `$env:PORT='5000'; node --enable-source-maps ./artifacts/api-server/dist/index.mjs"
Start-Process powershell -WorkingDirectory $PSScriptRoot -ArgumentList "-NoExit", "-Command", $apiCommand

Start-Sleep -Seconds 2

# Start Vite frontend
Write-Host "`nStarting Vite frontend on port 3000..." -ForegroundColor Cyan
Write-Host "Open http://localhost:3000 in your browser`n" -ForegroundColor Green
$env:PORT = "3000"
$env:BASE_PATH = "/"
pnpm --filter @workspace/deception-chess run dev
