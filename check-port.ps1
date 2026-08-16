# Check if port 3001 is already in use. Exit 0 = occupied, 1 = free.
try {
    $c = New-Object Net.Sockets.TcpClient
    $c.Connect('127.0.0.1', 3001)
    $c.Close()
    exit 0
} catch {
    exit 1
}
