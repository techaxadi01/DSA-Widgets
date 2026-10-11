@echo off
setlocal enabledelayedexpansion

title DSA Widgets Hub - Auto-Organizer & GitHub Sync

echo =======================================================
echo     DSA STUDY HUB - AUTO-ORGANIZER & GITHUB SYNC       
echo =======================================================
echo.
echo Scanning visualizers, updating catalog, and syncing to GitHub...
echo.

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Running Python scanner and GitHub syncer...
    python update_widgets.py %*
    if !ERRORLEVEL! neq 0 (
        echo.
        echo [ERROR] Python script encountered an issue.
        pause
        exit /b 1
    )
) else (
    where node >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [INFO] Python not found in PATH, running Node.js scanner and GitHub syncer...
        node update_widgets.js %*
        if !ERRORLEVEL! neq 0 (
            echo.
            echo [ERROR] Node script encountered an issue.
            pause
            exit /b 1
        )
    ) else (
        echo.
        echo [ERROR] Neither Python nor Node.js was found in your PATH.
        echo Please ensure Python or Node.js is installed.
        pause
        exit /b 1
    )
)

echo.
echo =======================================================
echo   COMPLETED: Hub indexed & GitHub repository synced!   
echo =======================================================
echo.
timeout /t 3 >nul
exit /b 0
