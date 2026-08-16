@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem Add node to PATH if missing (double-click cmd may not have it)
if exist "D:\Program Files\nodejs\node.exe" set "PATH=D:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"

rem Port-in-use check: if 3001 already responds, just open browser.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-port.ps1"
if not errorlevel 1 (
  echo [AJ] Port 3001 is in use. The server may already be running.
  echo Open http://localhost:3001 in your browser. To restart, run stop.bat first.
  start "" http://localhost:3001/
  pause
  exit /b 0
)

rem Launch server detached (logic in start-server.ps1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
if errorlevel 1 (
  echo Failed to launch server.
  pause
  exit /b 1
)

rem Wait for server then open browser (logic in wait.ps1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0wait.ps1"
if errorlevel 1 (
  echo Server did not start in time. Check server.log / server.err
  pause
  exit /b 1
)
start "" http://localhost:3001/
echo Server started. You can close this window; the server keeps running.
pause >nul
endlocal
