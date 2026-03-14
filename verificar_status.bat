@echo off
echo ==========================================
echo   VERIFICACAO DE STATUS DO PROJETO
echo ==========================================
echo.

if exist "sistema-cadastro-clientes" (
    echo [FRONTEND] Sistema de Clientes
    cd sistema-cadastro-clientes
    echo   Branch Atual:
    git branch --show-current
    echo   Ultimos 3 Commits:
    git log -3 --format="%%h - %%s"
    cd ..
)

echo.
echo ------------------------------------------
echo.

if exist "sistema-cadastro-backend" (
    echo [BACKEND] Sistema Backend
    cd sistema-cadastro-backend
    echo   Branch Atual:
    git branch --show-current
    echo   Ultimos 3 Commits:
    git log -3 --format="%%h - %%s"
    cd ..
)

echo.
echo ==========================================
pause