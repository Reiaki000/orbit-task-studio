@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is missing. Install Node.js 22+ and run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing Orbit dependencies (first run only)...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Check internet and try again from VS Code.
    pause
    exit /b 1
  )
)
echo Starting Orbit. Open the localhost URL shown below.
call npm run dev
pause
