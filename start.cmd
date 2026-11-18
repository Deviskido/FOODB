@echo off
setlocal
cd /d "%~dp0"
if exist "dist\produce-intelligence.exe" (
  "dist\produce-intelligence.exe"
  goto done
)
where bun >nul 2>nul
if errorlevel 1 (
  echo Bun is required. Install Bun from https://bun.com then run this launcher again.
  pause
  exit /b 1
)
if not exist "bun.lock" (
  call bun scripts/setup.ts
  if errorlevel 1 goto failed
)
call bun install --frozen-lockfile
if errorlevel 1 goto failed
call bun run build:windows
if errorlevel 1 goto failed
"dist\produce-intelligence.exe"
goto done
:failed
echo Build failed. Check the error above and your network connection.
:done
pause
