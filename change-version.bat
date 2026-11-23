@echo off
title Any Cloud - Change Version Everywhere
setlocal enabledelayedexpansion
cd /d "%~dp0"

:: Check PowerShell availability
where powershell.exe >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PowerShell was not found on your system.
    pause
    exit /b 1
)

:: Run PowerShell script passing any argument (e.g. change-version.bat 0.7.1)
if "%~1"=="" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\change-version.ps1"
) else (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\change-version.ps1" -NewVersion "%~1"
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to update version.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo Would you like to build the MSIX package now? [Y/N]
echo ========================================================
set /p BUILD_CHOICE="Enter Y to build MSIX, or press Enter to exit: "

if /i "%BUILD_CHOICE%"=="Y" (
    echo.
    call "%~dp0build-msix.bat"
) else (
    echo.
    echo Done. You can build later using build-msix.bat.
    pause
)
