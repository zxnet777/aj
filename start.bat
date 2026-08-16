@echo off
chcp 65001 >nul
setlocal

:: 切换到脚本所在目录（无论从哪里双击都能找到项目文件）
cd /d "%~dp0"

echo [阿杰学长] 正在准备...

:: 确保前端已构建（dist 不存在时才构建，避免每次都重建）
if not exist "dist\index.html" (
  echo [阿杰学长] 首次启动，正在构建前端（可能需要 1-2 分钟）...
  call npm run build
  if errorlevel 1 (
    echo [阿杰学长] 构建失败，请检查 Node 环境。
    pause
    exit /b 1
  )
)

:: 启动服务器（后台运行）
echo [阿杰学长] 启动服务器...
start "" /b node src/server/index.js > server.log 2>&1

:: 等待服务器就绪
echo [阿杰学长] 等待服务就绪...
set "PORT=3001"
powershell -Command "$p=3001; for($i=0;$i -lt 30;$i++){ try { if((Invoke-WebRequest -Uri \"http://localhost:$p/\" -UseBasicParsing -TimeoutSec 1).StatusCode -eq 200){exit 0} } catch {}; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
  echo [阿杰学长] 服务未在预期时间内就绪，请查看 server.log。
  pause
  exit /b 1
)

:: 打开浏览器
echo [阿杰学长] 打开浏览器...
start "" http://localhost:%PORT%/

echo [阿杰学长] 已启动！关闭此窗口不会停止服务；如需停止，结束 node 进程即可。
echo 按任意键退出此提示窗口（服务继续在后台运行）...
pause >nul
endlocal
