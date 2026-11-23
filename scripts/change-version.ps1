# Any Cloud - Synchronize Application Version Everywhere
[CmdletBinding()]
param (
    [string]$NewVersion = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $ProjectRoot

# Determine current version from tauri.conf.json or version.ts
$TauriConfPath = Join-Path $ProjectRoot "src-tauri\tauri.conf.json"
$CurrentVersion = "0.7.0"
if (Test-Path $TauriConfPath) {
    try {
        $TauriConf = Get-Content $TauriConfPath -Raw | ConvertFrom-Json
        $CurrentVersion = $TauriConf.version
    } catch {}
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Any Cloud - Application Version Manager              " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] Current Version: $CurrentVersion" -ForegroundColor Yellow
Write-Host ""

if (-not $NewVersion) {
    $NewVersion = Read-Host "Enter new version (e.g. 0.7.1 or 1.0.0)"
}

$NewVersion = $NewVersion.Trim().TrimStart('v').TrimStart('V')
if ($NewVersion -notmatch '^\d+\.\d+\.\d+(\.\d+)?$') {
    Write-Host "[!] Error: Version must be valid semantic versioning (e.g. 0.7.1 or 1.0.0)" -ForegroundColor Red
    exit 1
}

# Normalize to 3 parts (major.minor.patch) for semver and 4 parts for Windows MSIX
$Parts = $NewVersion.Split('.')
$SemVer = "$($Parts[0]).$($Parts[1]).$($Parts[2])"
$MsixVer = if ($Parts.Count -ge 4) { "$SemVer.$($Parts[3])" } else { "$SemVer.0" }

Write-Host ""
Write-Host "[*] Updating version to:" -ForegroundColor Cyan
Write-Host "    - App / Semantic Version : $SemVer" -ForegroundColor White
Write-Host "    - Windows MSIX Version   : $MsixVer" -ForegroundColor White
Write-Host ""

$UpdatedFiles = @()

# 1. Update src-tauri\tauri.conf.json
if (Test-Path $TauriConfPath) {
    $content = Get-Content $TauriConfPath -Raw
    $updated = $content -replace '"version"\s*:\s*"[^"]+"', "`"version`": `"$SemVer`""
    Set-Content -Path $TauriConfPath -Value $updated -NoNewline
    $UpdatedFiles += "src-tauri\tauri.conf.json"
}

# 2. Update src-tauri\Cargo.toml
$CargoTomlPath = Join-Path $ProjectRoot "src-tauri\Cargo.toml"
if (Test-Path $CargoTomlPath) {
    $content = Get-Content $CargoTomlPath -Raw
    $updated = $content -replace '(?m)^(version\s*=\s*)"[^"]+"', "`$1`"$SemVer`""
    Set-Content -Path $CargoTomlPath -Value $updated -NoNewline
    $UpdatedFiles += "src-tauri\Cargo.toml"
}

# 3. Update package.json
$PackageJsonPath = Join-Path $ProjectRoot "package.json"
if (Test-Path $PackageJsonPath) {
    $content = Get-Content $PackageJsonPath -Raw
    $updated = $content -replace '"version"\s*:\s*"[^"]+"', "`"version`": `"$SemVer`""
    Set-Content -Path $PackageJsonPath -Value $updated -NoNewline
    $UpdatedFiles += "package.json"
}

# 4. Update package-lock.json
$PackageLockPath = Join-Path $ProjectRoot "package-lock.json"
if (Test-Path $PackageLockPath) {
    $content = Get-Content $PackageLockPath -Raw
    $updated = $content -replace '(?m)^(\s*"version"\s*:\s*)"[^"]+"', "`$1`"$SemVer`""
    Set-Content -Path $PackageLockPath -Value $updated -NoNewline
    $UpdatedFiles += "package-lock.json"
}

# 5. Update src\frontend\version.ts
$VersionTsPath = Join-Path $ProjectRoot "src\frontend\version.ts"
$versionTsContent = @"
// Application Version Definition
// Automatically synced by change-version script
export const APP_VERSION = '$SemVer';
"@
Set-Content -Path $VersionTsPath -Value $versionTsContent
$UpdatedFiles += "src\frontend\version.ts"

# 6. Update target layouts or templates if present
$AltTauriConf = Join-Path $ProjectRoot "src\src-tauri\tauri.conf.json"
if (Test-Path $AltTauriConf) {
    $content = Get-Content $AltTauriConf -Raw
    $updated = $content -replace '"version"\s*:\s*"[^"]+"', "`"version`": `"$SemVer`""
    Set-Content -Path $AltTauriConf -Value $updated -NoNewline
    $UpdatedFiles += "src\src-tauri\tauri.conf.json"
}

$AltCargo = Join-Path $ProjectRoot "src\src-tauri\Cargo.toml"
if (Test-Path $AltCargo) {
    $content = Get-Content $AltCargo -Raw
    $updated = $content -replace '(?m)^(version\s*=\s*)"[^"]+"', "`$1`"$SemVer`""
    Set-Content -Path $AltCargo -Value $updated -NoNewline
    $UpdatedFiles += "src\src-tauri\Cargo.toml"
}

Write-Host "[+] Successfully updated version to $SemVer in:" -ForegroundColor Green
foreach ($f in $UpdatedFiles) {
    Write-Host "    - $f" -ForegroundColor White
}
Write-Host ""
Write-Host "All files are synchronized! Ready to compile or build MSIX ($MsixVer)." -ForegroundColor Cyan
