# Frees the Vite dev ports of stale node processes, then starts a single dev server.
# Vite defaults to 5173 and falls back to 5174 when that port is busy — checking both
# avoids the "which port did the last stale server take" guessing that used to happen by hand.

$vitePorts = 5173, 5174

foreach ($port in $vitePorts) {
    try {
        $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop
    } catch {
        continue
    }

    foreach ($listener in $listeners) {
        $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
        if ($process -and $process.ProcessName -eq 'node') {
            Write-Host "Killing stale node process on port $port (PID $($process.Id))"
            Stop-Process -Id $process.Id -Force -Confirm:$false
        }
    }
}

npm run dev
