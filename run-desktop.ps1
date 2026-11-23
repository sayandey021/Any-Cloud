# Any Cloud Desktop Application Launcher
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }

$exePath = Join-Path $scriptDir "target\release\any-cloud.exe"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Any Cloud Desktop - Building & Launching Latest Version" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Terminate existing instance if running to release file locks
Stop-Process -Name "any-cloud" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "[1/2] Compiling latest changes with Tauri..." -ForegroundColor Yellow
npx tauri build --no-bundle

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Build failed! Please review the errors above." -ForegroundColor Red
    pause
    exit $LASTEXITCODE
}

Write-Host "[2/2] Launching Any Cloud desktop app: $exePath" -ForegroundColor Green
Start-Process -FilePath $exePath -WorkingDirectory $scriptDir
Write-Host "`nAny Cloud launched successfully with latest changes!" -ForegroundColor Cyan
