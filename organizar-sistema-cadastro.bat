@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   Organizar pastas do Sistema de Cadastro
echo ============================================================
echo.
echo  Este script move para a pasta "sistema-cadastro":
echo    - sistema-cadastro-backend
echo    - sistema-cadastro-clientes
echo.
echo  IMPORTANTE: Feche o Cursor, o VS Code e qualquer terminal
echo  aberto dentro dessas pastas antes de continuar.
echo  O projeto "contab360" nao sera movido ^(fica na raiz de Projetos^).
echo.
pause

if exist "sistema-cadastro\sistema-cadastro-backend\" if exist "sistema-cadastro\sistema-cadastro-clientes\" (
    echo.
    echo [OK] Estrutura ja esta organizada ^(pastas ja estao em sistema-cadastro\^).
    goto :GIT
)

if not exist "sistema-cadastro\" mkdir "sistema-cadastro"

if exist "sistema-cadastro-backend\" (
    move "sistema-cadastro-backend" "sistema-cadastro\" >nul
    if errorlevel 1 (
        echo [ERRO] Nao foi possivel mover sistema-cadastro-backend.
        echo         Feche programas que estejam usando essa pasta e tente de novo.
        pause
        exit /b 1
    )
    echo [OK] sistema-cadastro-backend movido.
) else (
    echo [AVISO] Pasta sistema-cadastro-backend nao encontrada na raiz ^(ja movida?^).
)

if exist "sistema-cadastro-clientes\" (
    move "sistema-cadastro-clientes" "sistema-cadastro\" >nul
    if errorlevel 1 (
        echo [ERRO] Nao foi possivel mover sistema-cadastro-clientes.
        echo         Feche programas que estejam usando essa pasta e tente de novo.
        pause
        exit /b 1
    )
    echo [OK] sistema-cadastro-clientes movido.
) else (
    echo [AVISO] Pasta sistema-cadastro-clientes nao encontrada na raiz ^(ja movida?^).
)

:GIT
echo.
echo [Git] Atualizando indice ^(detecta renomeacao de pastas^)...
git add -A
echo.
echo Pronto. Use "git status" para revisar e faca o commit quando quiser.
echo No Cursor: adicione as pastas de "sistema-cadastro" ao workspace se precisar.
echo.
pause
