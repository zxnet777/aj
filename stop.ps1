# Stop the backend server listening on port 3001 (kills the owning node process).
$conn = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$ids = $conn | Select-Object -ExpandProperty OwningProcess -Unique
if ($ids) {
    $ids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Write-Host "Service on port 3001 stopped."
} else {
    Write-Host "No running service found on port 3001."
}
