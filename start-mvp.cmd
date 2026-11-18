@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node 26 or later is required. No package installation is needed.
  pause
  exit /b 1
)
node scripts/start-node.mjs
pause
