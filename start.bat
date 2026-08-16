@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem Add node to PATH if missing (double-click cmd may not have it)
if exist "D:\Program Files\nodejs\node.exe" set "PATH=D:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"

rem Start server in background
start "" /b node src/server/index.js > server.log 2>&1

rem Wait for server then open browser (logic in wait.ps1 to avoid quoting issues)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0wait.ps1"
if errorlevel 1 (
  echo Server did not start in time. See server.log
  pause
  exit /b 1
)
start "" http://localhost:3001/
echo Server started. Close this window (server keeps running). Press any key to exit.
pause >nul
endlocal
