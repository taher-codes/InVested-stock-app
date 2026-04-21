@echo off
setlocal

set "ROOT=%~dp0"
set "FRONTEND=%ROOT%frontend"

where mvn.cmd >nul 2>&1
if errorlevel 1 (
    echo Maven was not found. Install Maven or add it to PATH, then run this file again.
    pause
    exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
    echo Python was not found. Install Python or add it to PATH, then run this file again.
    pause
    exit /b 1
)

echo Starting InVested backend on http://localhost:8081
start "InVested Backend" /D "%ROOT%" cmd /k mvn.cmd "-Dmaven.repo.local=.m2repo" spring-boot:run

echo Starting InVested frontend on http://localhost:5500
start "InVested Frontend" /D "%FRONTEND%" cmd /k python -m http.server 5500

echo.
echo Give the backend a few seconds to finish loading the large seed, then open:
echo   http://localhost:5500
echo.
pause
