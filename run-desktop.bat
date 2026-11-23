@echo off
title Any Cloud Desktop Launcher
cd /d "%~dp0"

echo ========================================================
echo  Any Cloud Desktop - Building ^& Launching Latest Version
echo ========================================================

:: Close existing instance if running to prevent file lock
taskkill /F /IM any-cloud.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo [1/2] Compiling latest changes with Tauri...
call npx tauri build --no-bundle
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed! Please review the errors above.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/2] Launching Any Cloud desktop app...
start "" /D "%~dp0" "%~dp0target\release\any-cloud.exe"
echo.
echo Any Cloud is running with the latest changes! You can close this window.
