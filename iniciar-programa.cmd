@echo off
cd /d "%~dp0"

echo.
echo ========================================
echo  Iniciando Plataforma Telespazio
echo ========================================
echo.

echo 1) Levantando PostgreSQL con Docker...
docker compose up -d
if errorlevel 1 (
  echo.
  echo ERROR: No pude levantar PostgreSQL.
  echo Asegurate de tener Docker Desktop abierto.
  pause
  exit /b 1
)

echo.
echo 2) Aplicando migraciones de base de datos...
npx prisma migrate deploy
if errorlevel 1 (
  echo.
  echo ERROR: No pude aplicar migraciones.
  pause
  exit /b 1
)

echo.
echo 3) Compilando el aplicativo...
npm run build
if errorlevel 1 (
  echo.
  echo ERROR: El build fallo.
  pause
  exit /b 1
)

echo.
echo 4) Abri en tu navegador:
echo    http://127.0.0.1:3000/login
echo.
echo Para apagarlo despues, cerra esta ventana o presiona Ctrl+C.
echo.

npm run start
