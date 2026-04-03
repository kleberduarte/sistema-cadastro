@echo off
chcp 65001 >nul
set LESSCHARSET=utf-8
set "ROOT=%~dp0"
echo ==========================================
echo   VERIFICACAO DE STATUS DO PROJETO
echo ==========================================
echo.

if exist "%ROOT%sistema-cadastro-clientes" (
    pushd "%ROOT%sistema-cadastro-clientes"
    call :ShowGitLog "[FRONTEND] Sistema de Clientes"
    popd
)

echo.
echo ------------------------------------------
echo.

if exist "%ROOT%sistema-cadastro-backend" (
    pushd "%ROOT%sistema-cadastro-backend"
    call :ShowGitLog "[BACKEND] Sistema Backend"
    popd
)

echo.
echo ==========================================
pause
exit /b

:ShowGitLog
echo %~1
echo   Posicionamento das Branches (Local e Remoto):
for /f "delims=" %%i in ('git log --all --decorate --oneline -n 5') do echo %%i
echo.
exit /b
