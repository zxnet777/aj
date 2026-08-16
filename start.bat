@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem Add node to PATH if missing (double-click cmd may not have it)
if exist "D:\Program Files\nodejs\node.exe" set "PATH=D:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"

rem Node version check: node:sqlite (experimental) requires Node 22+
powershell -NoProfile -ExecutionPolicy Bypass -Command "$v=(node -v); $maj=[int]($v.TrimStart('v').Split('.')[0]); if(-not $maj){Write-Host 'ERROR: Node.js not found.'; exit 2} if($maj -lt 22){Write-Host ('ERROR: Node '+$maj+' detected. Need Node 22+ (uses node:sqlite).'); exit 2} Write-Host ('Node '+ $v + ' OK')"
if errorlevel 1 (
  echo Node 22+ is required. Please install Node.js 22 or later.
  pause
  exit /b 1
)

rem Build the frontend if dist/ is missing (avoids blank page on first run)
if not exist "dist\index.html" (
  echo [AJ] Frontend not built yet. Running npm run build, this may take 1-2 minutes...
  call npm run build
  if errorlevel 1 (
    echo Build failed. Check the output above.
    pause
    exit /b 1
  )
)

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
