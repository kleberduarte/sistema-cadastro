@echo off
cd /d "%~dp0"

echo Verificando processos na porta 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do (
    echo Encerrando processo PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo Iniciando aplicação...
mvn spring-boot:run
pause

