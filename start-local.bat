@echo off
REM Glassy PM — uso só na sua máquina (Windows)
REM Requisitos: Node.js 20+ e Docker Desktop (ou Postgres local)
cd /d %~dp0
if not exist .env copy .env.example .env
echo Subindo Postgres no Docker...
docker compose up -d
echo Aguarde 5 segundos na primeira vez...
timeout /t 5 /nobreak >nul
echo Se for a primeira vez, aplique o schema UMA vez com:
echo   psql "postgres://glassy:glassy123@localhost:5432/glassy_pm" -f schema.sql
if not exist node_modules npm install
echo Abrindo em http://localhost:4000/frontend/auth.html
npm run dev
pause
