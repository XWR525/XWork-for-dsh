@echo off
setlocal
rem Prefer the newer Node.js (C:\Program Files\nodejs) when present, because the
rem nvm4w default Node 22.x does not satisfy the project's engines requirement.
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
echo Starting XWork for dsh (Ctrl+C to stop)...
call pnpm dev
echo.
echo XWork for dsh has stopped.
pause
