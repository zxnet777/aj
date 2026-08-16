@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem Add node to PATH if missing (double-click cmd may not have it)
if exist "D:\Program Files\nodejs\node.exe" set "PATH=D:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"

rem Port-in-use check: if 3001 already responds, just open browser.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-port.ps1"
if not errorlevel 1 (
  echo [阿杰学长] 端口 3001 已被占用，服务可能已在运行。
  echo 浏览器打开 http://localhost:3001 即可；如需重启请先双击 stop.bat。
  start "" http://localhost:3001/
  pause
  exit /b 0
)

rem Launch server detached (logic in start-server.ps1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
if errorlevel 1 (
  echo Failed to launch server. See server.log / server.err
  pause
  exit /b 1
)

rem Wait for server then open browser (logic in wait.ps1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0wait.ps1"
if errorlevel 1 (
  echo Server did not start in time. See server.log
  pause
  exit /b 1
)
start "" http://localhost:3001/
echo Server started. You can close this window; the server keeps running.
pause >nul
endlocal
