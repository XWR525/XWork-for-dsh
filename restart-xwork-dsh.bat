@echo off
setlocal
rem restart-xwork-dsh: kill every residual instance of this project (electron /
rem electron-vite process trees), drop the stale settings lock if any, then
rem start a clean instance. Safe to re-run at any time - doubles as a reset
rem switch when the app gets into a bad state.

rem Prefer the newer Node.js (C:\Program Files\nodejs) when present, because the
rem nvm4w default Node 22.x does not satisfy the project's engines requirement.
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

echo [1/2] Cleaning up residual instances...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$proj = Split-Path -Parent '%~f0';" ^
  "$procs = @(Get-CimInstance Win32_Process -Filter \"Name='electron.exe' OR Name='node.exe'\" | Where-Object { $c = $_.CommandLine; $c -and ($c -like '*electron-vite*' -or ($_.Name -eq 'electron.exe' -and $c -like \"*$proj*\")) });" ^
  "if ($procs.Count -eq 0) { Write-Host '  no residual instance.' }" ^
  "else {" ^
  "  Write-Host ('  killing {0} process tree(s)...' -f $procs.Count);" ^
  "  foreach ($p in $procs) { taskkill /PID $p.ProcessId /T /F 2>$null | Out-Null }" ^
  "  foreach ($p in $procs) { try { Wait-Process -Id $p.ProcessId -Timeout 15 -ErrorAction Stop } catch {} }" ^
  "}" ^
  "$lock = Join-Path $env:USERPROFILE '.dsh\settings.yaml.lock';" ^
  "if (Test-Path $lock) { Remove-Item $lock -Force; Write-Host '  removed stale settings lock.' }"

echo [2/2] Starting XWork for dsh (Ctrl+C to stop)...
call pnpm dev
echo.
echo XWork for dsh has stopped.
