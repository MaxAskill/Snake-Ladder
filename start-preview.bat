@echo off
setlocal
cd /d "%~dp0"

if not exist "dist\index.html" (
  echo Production build not found in dist.
  echo Ask Codex to rebuild the project first.
  pause
  exit /b 1
)

echo.
echo Snakes ^& Ladders production preview
echo ------------------------------------
echo Open this address in your browser:
echo.
echo     http://localhost:4173
echo.
echo Keep this window open while testing.
echo Press Ctrl+C to stop the preview.
echo.

where py >nul 2>nul
if %errorlevel% equ 0 (
  py -m http.server 4173 --bind 127.0.0.1 --directory dist
) else (
  python -m http.server 4173 --bind 127.0.0.1 --directory dist
)

if errorlevel 1 (
  echo.
  echo Could not start the preview. Make sure Python is installed.
  pause
)
