@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo  Nazareno Bets IA 3.4 - Deploy Final
echo ==========================================
echo.
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo ERRO: Node.js nao encontrado.
  echo Instale o Node.js em https://nodejs.org/
  echo Depois execute este arquivo novamente.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando dependencias na primeira execucao...
  npm install
)
echo.
echo Abrindo plataforma em http://localhost:3026
timeout /t 2 /nobreak >nul
start http://localhost:3026
npm start
pause
