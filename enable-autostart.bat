@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SRC=%~dp0launch.vbs"
set "LNK=%STARTUP%\阿杰学长.vbs.lnk"

:: 用 PowerShell 创建快捷方式（含工作目录，确保相对路径正确）
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%LNK%'); $s.TargetPath = '%SRC%'; $s.WorkingDirectory = '%~dp0'; $s.Description = '阿杰学长 学习助手'; $s.Save()"

if exist "%LNK%" (
  echo [阿杰学长] 已开启开机自启！下次开机自动启动并打开浏览器。
  echo 如需关闭：删除「启动」文件夹里的「阿杰学长.vbs.lnk」即可。
) else (
  echo [阿杰学长] 创建快捷方式失败，请手动把 launch.vbs 拖到：
  echo %STARTUP%
)
pause
endlocal
