@echo off
title Any Cloud - MSIX Package Builder
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ========================================================
echo   Any Cloud Desktop - Build MSIX for Microsoft Store
echo ========================================================
echo.

:: Check PowerShell availability
where powershell.exe >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PowerShell was not found on your system.
    pause
    exit /b 1
)

:: Run PowerShell build script passing any extra arguments (e.g. -SkipCompile or -SignForTesting)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-msix.ps1" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] MSIX Build failed! Please review the error log above.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Opening output folder: "%~dp0target\msix"
explorer.exe "%~dp0target\msix"
echo.
echo Build complete! You can upload this .msix directly to Microsoft Partner Center.
pause
