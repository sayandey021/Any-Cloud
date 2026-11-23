# Any Cloud MSIX Build & Package Script
# Generates Windows Store compliant .msix package using Microsoft Partner Center product identity.

[CmdletBinding()]
param (
    [switch]$SkipCompile = $false,
    [switch]$SignForTesting = $false,
    [string]$CustomVersion = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $ProjectRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Any Cloud - MSIX Windows Store Package Builder       " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Product Identity from Microsoft Partner Center
$IdentityName = "Saayan.AnyCloud"
$IdentityPublisher = "CN=37E2AF47-D2FC-489C-BDC1-02C989A7B989"
$PublisherDisplayName = "SaayanSoft"
$DisplayName = "Any Cloud"
$Description = "Unified, lightweight, modern multi-cloud desktop file manager."

# 2. Extract Version from tauri.conf.json
$TauriConfPath = Join-Path $ProjectRoot "src-tauri\tauri.conf.json"
if ($CustomVersion) {
    $RawVersion = $CustomVersion
} elseif (Test-Path $TauriConfPath) {
    $TauriConf = Get-Content $TauriConfPath -Raw | ConvertFrom-Json
    $RawVersion = $TauriConf.version
} else {
    $RawVersion = "0.1.0"
}

# MSIX requires a 4-part version: Major.Minor.Build.Revision (e.g., 0.1.0.0)
$VersionParts = $RawVersion.Split('.')
while ($VersionParts.Count -lt 4) {
    $VersionParts += "0"
}
$PackageVersion = ($VersionParts[0..3]) -join '.'
Write-Host "[*] Target Package Identity : $IdentityName" -ForegroundColor White
Write-Host "[*] Publisher               : $IdentityPublisher" -ForegroundColor White
Write-Host "[*] Publisher Display Name  : $PublisherDisplayName" -ForegroundColor White
Write-Host "[*] Package Version         : $PackageVersion" -ForegroundColor White
Write-Host ""

# 3. Locate makeappx.exe and signtool.exe from Windows SDK
Write-Host "[1/5] Locating Windows 10/11 SDK tools..." -ForegroundColor Yellow
$SdkBasePaths = @(
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin",
    "${env:ProgramFiles}\Windows Kits\10\bin"
)

$MakeAppxPath = $null
$SignToolPath = $null

foreach ($base in $SdkBasePaths) {
    if (Test-Path $base) {
        $found = Get-ChildItem -Path $base -Filter "makeappx.exe" -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -like "*\x64\*" } |
            Sort-Object FullName -Descending |
            Select-Object -First 1

        if ($found) {
            $MakeAppxPath = $found.FullName
            $sdkDir = Split-Path $MakeAppxPath -Parent
            $st = Join-Path $sdkDir "signtool.exe"
            if (Test-Path $st) {
                $SignToolPath = $st
            }
            break
        }
    }
}

if (-not $MakeAppxPath) {
    Write-Error "Could not locate 'makeappx.exe' in Windows Kits. Please ensure Windows 10/11 SDK is installed."
    exit 1
}

Write-Host "      Found MakeAppx : $MakeAppxPath" -ForegroundColor DarkGray
if ($SignToolPath) {
    Write-Host "      Found SignTool : $SignToolPath" -ForegroundColor DarkGray
}

# 4. Compile Production Release
if (-not $SkipCompile) {
    Write-Host ""
    Write-Host "[2/5] Compiling production release with Tauri & Vite..." -ForegroundColor Yellow
    
    # Close any running instance
    Get-Process -Name "any-cloud" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1

    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend build failed."
        exit $LASTEXITCODE
    }

    npx tauri build --no-bundle
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Tauri release compilation failed."
        exit $LASTEXITCODE
    }
} else {
    Write-Host ""
    Write-Host "[2/5] Skipping compilation as requested (-SkipCompile)." -ForegroundColor DarkGray
}

$ReleaseExe = Join-Path $ProjectRoot "target\release\any-cloud.exe"
if (-not (Test-Path $ReleaseExe)) {
    Write-Error "Release executable not found at: $ReleaseExe"
    exit 1
}

# 5. Prepare MSIX Layout Folder
Write-Host ""
Write-Host "[3/5] Staging MSIX package directory..." -ForegroundColor Yellow
$LayoutDir = Join-Path $ProjectRoot "target\msix_layout"
$OutputDir = Join-Path $ProjectRoot "target\msix"

if (Test-Path $LayoutDir) {
    Remove-Item $LayoutDir -Recurse -Force
}
New-Item -ItemType Directory -Path "$LayoutDir\Assets" -Force | Out-Null
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# Copy binary
Copy-Item $ReleaseExe -Destination "$LayoutDir\any-cloud.exe" -Force

# Copy rclone binary for cloud storage operations
if (Test-Path "$ProjectRoot\bin\rclone.exe") {
    Copy-Item "$ProjectRoot\bin\rclone.exe" -Destination "$LayoutDir\rclone.exe" -Force
    New-Item -ItemType Directory -Path "$LayoutDir\bin" -Force | Out-Null
    Copy-Item "$ProjectRoot\bin\rclone.exe" -Destination "$LayoutDir\bin\rclone.exe" -Force
    Write-Host "      Bundled rclone.exe into MSIX package." -ForegroundColor Green
}

# Ensure all tiles & splash screen exist
& "$PSScriptRoot\prepare-msix-assets.ps1" -IconPath "src-tauri\icons\icon.png" -OutputDir "src-tauri\icons"

$AssetFiles = @(
    "StoreLogo.png",
    "Square44x44Logo.png",
    "Square71x71Logo.png",
    "Square150x150Logo.png",
    "Square310x310Logo.png",
    "Wide310x150Logo.png",
    "SplashScreen.png"
)

foreach ($asset in $AssetFiles) {
    $src = Join-Path $ProjectRoot "src-tauri\icons\$asset"
    if (Test-Path $src) {
        Copy-Item $src -Destination "$LayoutDir\Assets\$asset" -Force
    } else {
        Write-Warning "Asset not found: $src"
    }
}

# Generate AppxManifest.xml
$TemplatePath = Join-Path $ProjectRoot "scripts\AppxManifest.template.xml"
$ManifestContent = Get-Content $TemplatePath -Raw
$ManifestContent = $ManifestContent.Replace("__VERSION__", $PackageVersion)
Set-Content -Path "$LayoutDir\AppxManifest.xml" -Value $ManifestContent -Encoding UTF8
Write-Host "      AppxManifest.xml generated successfully." -ForegroundColor DarkGray

# 6. Pack MSIX with MakeAppx.exe
Write-Host ""
Write-Host "[4/5] Packing MSIX package with MakeAppx..." -ForegroundColor Yellow
$OutputMsix = Join-Path $OutputDir "AnyCloud_${PackageVersion}_x64.msix"

if (Test-Path $OutputMsix) {
    Remove-Item $OutputMsix -Force
}

$packArgs = @("pack", "/d", $LayoutDir, "/p", $OutputMsix, "/o")
& $MakeAppxPath $packArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "makeappx pack failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "      MSIX package created successfully!" -ForegroundColor Green

# 7. Optional Test Signing for local side-loading
if ($SignForTesting) {
    Write-Host ""
    Write-Host "[5/5] Signing MSIX with self-signed certificate for local testing..." -ForegroundColor Yellow
    $CertSubject = $IdentityPublisher
    $CertPath = Join-Path $OutputDir "AnyCloud_TestCert.pfx"
    $CertPassword = ConvertTo-SecureString "AnyCloud123!" -AsPlainText -Force

    $existingCert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -eq $CertSubject } | Select-Object -First 1

    if (-not $existingCert) {
        Write-Host "      Generating self-signed test code-signing certificate..." -ForegroundColor DarkGray
        $cert = New-SelfSignedCertificate -Type Custom `
            -Subject $CertSubject `
            -KeyUsage DigitalSignature `
            -FriendlyName "Any Cloud Test Cert" `
            -CertStoreLocation "Cert:\CurrentUser\My" `
            -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3")

        Export-PfxCertificate -Cert $cert -FilePath $CertPath -Password $CertPassword | Out-Null
    } else {
        $cert = $existingCert
    }

    if ($SignToolPath) {
        & $SignToolPath sign /fd SHA256 /a /f $CertPath /p "AnyCloud123!" $OutputMsix
        if ($LASTEXITCODE -eq 0) {
            Write-Host "      Signed successfully for local sideloading." -ForegroundColor Green
        }
    }
} else {
    Write-Host ""
    Write-Host "[5/5] Note: For Microsoft Partner Center Store submission, do NOT sign locally." -ForegroundColor DarkGray
    Write-Host "      Microsoft Store automatically signs the package with their official trusted certificate." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  MSIX BUILD COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Output File: $OutputMsix" -ForegroundColor White
Write-Host "Ready to upload to Microsoft Partner Center Store Submission!" -ForegroundColor Cyan
Write-Host ""
