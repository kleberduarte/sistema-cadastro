@echo off
echo ==========================================
echo   VERIFICACAO DE STATUS DO PROJETO
echo ==========================================
echo.

if exist "sistema-cadastro-clientes" (
    echo [FRONTEND] Sistema de Clientes
    cd sistema-cadastro-clientes
    echo   Posicionamento das Branches (Local e Remoto):
    git log --all --decorate --oneline --graph -n 5
    echo.
    cd ..
)

echo.
echo ------------------------------------------
echo.

if exist "sistema-cadastro-backend" (
    echo [BACKEND] Sistema Backend
    cd sistema-cadastro-backend
    echo   Posicionamento das Branches (Local e Remoto):
    git log --all --decorate --oneline --graph -n 5
    echo.
    cd ..
)

echo.
echo ==========================================
pause