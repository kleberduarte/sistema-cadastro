@echo off
cd /d "%~dp0"
setlocal

rem =================================================================
rem   SCRIPT PARA INICIAR O BACKEND (SPRING BOOT)
rem   - Procura e encerra qualquer processo usando a porta definida.
rem   - Compila e executa a aplicação com Maven.
rem =================================================================

set APP_PORT=8080

echo.
echo [INFO] Verificando se o Maven (mvn) esta instalado e no PATH...
where mvn >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] O comando 'mvn' nao foi encontrado.
    echo        Por favor, instale o Apache Maven e configure a variavel de ambiente PATH.
    echo.
    pause
    exit /b
)
echo [INFO] Maven encontrado.

echo.
echo [INFO] Verificando processos na porta %APP_PORT%...
set "PID_FOUND="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%APP_PORT% ^| findstr LISTENING') do (
    echo [INFO] Processo encontrado com PID: %%a. Encerrando...
    taskkill /F /PID %%a >nul 2>&1
    set "PID_FOUND=true"
)

if not defined PID_FOUND (
    echo [INFO] Nenhuma aplicacao em execucao na porta %APP_PORT%.
)

echo.
echo [INFO] Iniciando a aplicacao Spring Boot...
echo =================================================================
mvn spring-boot:run

echo.
echo =================================================================
echo A aplicacao foi encerrada ou falhou ao iniciar.
pause
