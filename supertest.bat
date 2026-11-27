@echo off
REM Barrierefreiheits-Supertest mit einem Doppelklick (Demo-Seiten) oder: supertest.bat https://www.example.de
REM Installiert beim ersten Mal die Pakete und Chromium, oeffnet am Ende reports\bericht.html.
cd /d "%~dp0"
where npm >nul 2>nul || (echo Node.js 22 fehlt: https://nodejs.org & pause & exit /b 1)
if not exist node_modules call npm ci || (pause & exit /b 1)
call npx playwright install chromium
if not "%~1"=="" set "BASE_URL=%~1"
call npm run supertest
if exist reports\bericht.html start "" reports\bericht.html
pause
