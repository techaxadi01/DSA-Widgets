@echo off
setlocal enabledelayedexpansion

title DSA Widgets Hub - Auto-Organizer

echo =======================================================
echo          DSA STUDY HUB - AUTOMATED ORGANIZER           
echo =======================================================
echo.
echo Scanning directory for new and updated visualizers...
echo.

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Running Python scanner...
    python update_widgets.py
    if !ERRORLEVEL! neq 0 (
        echo.
        echo [ERROR] Python script encountered an issue.
        pause
        exit /b 1
    )
) else (
    where node >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [INFO] Python not found in PATH, running Node.js scanner...
        node update_widgets.js
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
echo   SUCCESS! All widgets indexed into widgets-data.js   
echo =======================================================
echo.
echo Catalog updated successfully.
timeout /t 2 >nul
exit /b 0
