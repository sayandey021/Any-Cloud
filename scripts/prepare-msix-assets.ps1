param (
    [string]$IconPath = "src-tauri\icons\icon.png",
    [string]$OutputDir = "src-tauri\icons"
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $IconPath)) {
    Write-Warning "Source icon not found at: $IconPath"
    exit 0
}

$icon = [System.Drawing.Image]::FromFile((Resolve-Path $IconPath))

function Create-Canvas([int]$width, [int]$height, [int]$innerSize, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(15, 23, 42)) # #0F172A slate-900 background
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    
    $x = [int](($width - $innerSize) / 2)
    $y = [int](($height - $innerSize) / 2)
    $g.DrawImage($icon, $x, $y, $innerSize, $innerSize)
    $g.Dispose()
    
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created: $outputPath ($width x $height)"
}

# 1. SplashScreen.png (620x300)
$splashPath = Join-Path $OutputDir "SplashScreen.png"
if (-not (Test-Path $splashPath)) {
    Create-Canvas 620 300 130 $splashPath
}

# 2. Wide310x150Logo.png (310x150)
$widePath = Join-Path $OutputDir "Wide310x150Logo.png"
if (-not (Test-Path $widePath)) {
    Create-Canvas 310 150 90 $widePath
}

$icon.Dispose()
