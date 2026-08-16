@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem Add node to PATH if missing (double-click cmd may not have it)
if exist "D:\Program Files\nodejs\node.exe" set "PATH=D:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"

rem 端口占用检测：若 3001 已被占用，提示用 stop.bat 停止旧服务
powershell -NoProfile -Command "try { $c=New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',3001); $c.Close(); exit 0 } catch { exit 1 }"
if not errorlevel 1 (
  echo [阿杰学长] 端口 3001 已被占用，服务可能已在运行。
  echo 浏览器打开 http://localhost:3001 即可；如需重启请先双击 stop.bat。
  start "" http://localhost:3001/
  pause
  exit /b 0
)

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
