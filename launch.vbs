' 阿杰学长 —— 后台静默启动（双击无黑框），自动打开浏览器
' 用法：双击本文件即可。开机自启可把本文件快捷方式放进「启动」文件夹。

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

' 项目根目录 = 本脚本所在目录
root = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = root

' 若未构建则先构建
If Not fso.FileExists(root & "\dist\index.html") Then
    shell.Run "cmd /c npm run build", 0, True
End If

' 后台启动服务器（0 = 隐藏窗口）
shell.Run "node src/server/index.js", 0, False

' 等待服务就绪后打开浏览器
port = "3001"
ready = False
For i = 1 To 30
    On Error Resume Next
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
    http.Open "GET", "http://localhost:" & port & "/", False
    http.Send
    If http.Status = 200 Then ready = True
    On Error GoTo 0
    If ready Then Exit For
    WScript.Sleep 1000
Next

shell.Run "http://localhost:" & port & "/", 1, False
