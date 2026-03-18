@echo off
setlocal EnableExtensions
chcp 65001 >nul

cd /d "%~dp0"
set "FRONT_DIR=%~dp0"
set "BACKEND_DIR=%~dp0..\sistema-cadastro-backend"

echo.
echo  ========== SISTEMA (API + Front AUTO) ==========
echo.

echo  Liberando portas (8080 e 5500-5540) para nao dar conflito...
for %%P in (8080 5500 5501 5502 5503 5504 5505 5506 5507 5508 5509 5510 5511 5512 5513 5514 5515 5516 5517 5518 5519 5520 5521 5522 5523 5524 5525 5526 5527 5528 5529 5530 5531 5532 5533 5534 5535 5536 5537 5538 5539 5540) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
  )
)
echo  Portas liberadas.
echo.

del /q "%FRONT_DIR%ULTIMA_URL_FRONT.txt" "%FRONT_DIR%PORTA_FRONT.txt" 2>nul

rem ================= BACKEND (API) =================
if exist "%BACKEND_DIR%\pom.xml" (
  echo  [1/2] Iniciando BACKEND na porta 8080 em nova janela...
  start "BACKEND - API 8080" cmd /c "cd /d %BACKEND_DIR% && mvn spring-boot:run"
) else (
  echo  AVISO: Backend nao encontrado em:
  echo    %BACKEND_DIR%
  echo  Inicie a API manualmente na porta 8080.
)

rem ================= FRONT =================
echo.
echo  [2/2] Iniciando FRONT (porta automatica)...
echo        A URL vai ser lida de: ULTIMA_URL_FRONT.txt
start "FRONT - Login" cmd /c "cd /d %FRONT_DIR% && node server-estatico.js"

rem ================= ABRIR NO NAVEGADOR =================
echo.
echo  Abrindo login no navegador...

set "URL="
set "URL_OPENED=0"

for /l %%T in (1,1,60) do (
  if "%URL_OPENED%"=="0" (
    if exist "%FRONT_DIR%ULTIMA_URL_FRONT.txt" (
      for /f "usebackq delims=" %%u in ("%FRONT_DIR%ULTIMA_URL_FRONT.txt") do set "URL=%%u"
      if not "%URL%"=="" set "URL_OPENED=1"
    )
    if "%URL_OPENED%"=="0" timeout /t 1 >nul
  )
)

if "%URL%"=="" (
  if exist "%FRONT_DIR%PORTA_FRONT.txt" (
    for /f "usebackq delims=" %%p in ("%FRONT_DIR%PORTA_FRONT.txt") do set "URL=http://127.0.0.1:%%p/login.html"
  )
)

if "%URL%"=="" set "URL=http://127.0.0.1:5500/login.html"

start "" "%URL%"
pause

