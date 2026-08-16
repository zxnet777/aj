@echo off
setlocal EnableExtensions
echo [阿杰学长] 正在停止服务（端口 3001）...
powershell -NoProfile -Command "$p=Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if($p){ Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Host '已停止。' } else { Write-Host '未发现运行中的服务。' }"
pause
endlocal
