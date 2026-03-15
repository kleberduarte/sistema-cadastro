@echo off
chcp 65001 >nul
set LESSCHARSET=utf-8
echo ==========================================
echo   VERIFICACAO DE STATUS DO PROJETO
echo ==========================================
echo.

if exist "sistema-cadastro-clientes" (
    pushd "sistema-cadastro-clientes"
    call :ShowGitLog "[FRONTEND] Sistema de Clientes"
    popd
)

echo.
echo ------------------------------------------
echo.

if exist "sistema-cadastro-backend" (
    pushd "sistema-cadastro-backend"
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