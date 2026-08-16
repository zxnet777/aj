# Launch the node server detached from this script's process tree,
# so closing the .bat window does NOT kill the server.
# No stdout/stderr redirection here (avoids PowerShell "input redirection"
# errors under certain hosts); logs are optional and written by the app.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$node = Join-Path $env:ProgramFiles 'nodejs\node.exe'
if (-not (Test-Path $node)) {
    $node = (Get-Command node -ErrorAction SilentlyContinue).Source
}
if (-not $node) {
    Write-Host 'ERROR: node.exe not found. Install Node.js or fix PATH.'
    exit 1
}

# -WindowStyle Hidden + default (no -Wait) detaches it from this script.
Start-Process -FilePath $node `
    -ArgumentList 'src/server/index.js' `
    -WorkingDirectory $root `
    -WindowStyle Hidden

Write-Host 'Server launched.'
exit 0
