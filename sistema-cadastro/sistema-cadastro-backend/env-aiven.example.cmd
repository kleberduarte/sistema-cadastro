@echo off
REM Copie este arquivo para env-aiven.local.cmd e preencha DB_PASSWORD.
REM O arquivo env-aiven.local.cmd está no .gitignore.

set SPRING_PROFILES_ACTIVE=aiven
set DB_PASSWORD=SUA_SENHA_DO_CONSOLE_AIVEN

echo Rodando com profile aiven. Ajuste DB_PASSWORD se necessario.
cd /d "%~dp0"
call mvn spring-boot:run
pause
