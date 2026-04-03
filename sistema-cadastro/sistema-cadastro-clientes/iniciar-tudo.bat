@echo off
setlocal EnableExtensions
chcp 65001 >nul

cd /d "%~dp0"
set "FRONT_DIR=%~dp0"
set "BACKEND_DIR=%~dp0..\sistema-cadastro-backend"

echo.
echo  ========== SISTEMA (API + Front) ==========
echo.

echo  Liberando portas (8080 e 5500-5540) para nao dar conflito...
for %%P in (8080 5500 5501 5502 5503 5504 5505 5506 5507 5508 5509 5510 5511 5512 5513 5514 5515 5516 5517 5518 5519 5520 5521 5522 5523 5524 5525 5526 5527 5528 5529 5530 5531 5532 5533 5534 5535 5536 5537 5538 5539 5540) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
  )
)
echo  Portas liberadas.
echo.

rem ================= BACKEND (API) =================
if exist "%BACKEND_DIR%\pom.xml" (
  echo  [1/2] Iniciando BACKEND (8080) em nova janela...
  start "BACKEND - API 8080" cmd /k "cd /d %BACKEND_DIR% && call run.bat"
) else (
  echo  AVISO: Backend nao encontrado em:
  echo    %BACKEND_DIR%
  echo  Inicie a API manualmente na porta 8080.
)

rem ================= FRONT =================
echo.
echo  [2/2] Iniciando FRONT (porta automatica)...
echo        A URL certa vai aparecer em: ULTIMA_URL_FRONT.txt
start "FRONT - Login" cmd /k "cd /d %FRONT_DIR% && call iniciar-front.bat"

rem ================= ABRIR NO NAVEGADOR =================
echo.
echo  Abrindo login no navegador...
set "URL="
set /a i=0

:WAIT_URL
if exist "%FRONT_DIR%ULTIMA_URL_FRONT.txt" (
  for /f "usebackq delims=" %%u in ("%FRONT_DIR%ULTIMA_URL_FRONT.txt") do set "URL=%%u"
)

if not "%URL%"=="" goto OPEN_BROWSER
timeout /t 1 >nul
set /a i+=1
if %i% LSS 30 goto WAIT_URL

echo.
echo  Nao foi possivel ler ULTIMA_URL_FRONT.txt a tempo.
echo  Abra manualmente: %FRONT_DIR%ULTIMA_URL_FRONT.txt
pause
goto END

:OPEN_BROWSER
echo  Abrindo: %URL%
start "" "%URL%"

:END
pause
