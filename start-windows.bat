@echo off
REM Opens two windows: the API and the web app.
echo Starting the Village Bank...
start "Village Bank API" cmd /k "cd backend && npm install && npm start"
timeout /t 5 /nobreak >nul
start "Village Bank Web" cmd /k "cd frontend && npm install && npm run dev"
echo.
echo When both windows are ready, open http://localhost:5173
pause
