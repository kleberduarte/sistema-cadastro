@echo off
setlocal enabledelayedexpansion
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ==========================================
echo   ATUALIZACAO AUTOMATICA DE BRANCHES
echo ==========================================

set "DIR_CLIENTES=%ROOT%sistema-cadastro-clientes"
set "DIR_BACKEND=%ROOT%sistema-cadastro-backend"

if exist "%DIR_CLIENTES%" (
    echo.
    echo [FRONTEND] Processando sistema-cadastro-clientes...
    cd /d "%DIR_CLIENTES%"
    
    echo.
    echo [DEBUG] Status do Git ^(arquivos modificados^):
    git status -s
    echo.

    git add --all

    git diff --staged --quiet
    if !errorlevel! neq 0 (
        echo [INFO] Alteracoes encontradas no Frontend. Criando commit...
        git commit -m "Feat(PDV): Adiciona status de caixa (Livre, Pausado, Fechado) e atualiza rodapé de atalhos"
    ) else (
        echo [INFO] Frontend: Nenhuma alteracao nova para commitar. A mudanca pode ja estar no historico ou o arquivo esta sendo ignorado.
    )
    
    git checkout develop
    git pull origin develop
    git push origin develop
    
    git checkout main
    git pull origin main
    git merge --no-ff develop -m "Release: Funcionalidade de status do caixa e melhorias de usabilidade no PDV"
    git push origin main
    
    git checkout develop
    cd /d "%ROOT%"
)

if exist "%DIR_BACKEND%" (
    echo.
    echo [BACKEND] Processando sistema-cadastro-backend...
    cd /d "%DIR_BACKEND%"
    
    git add .
    git diff --staged --quiet
    if !errorlevel! neq 0 (
        echo [INFO] Alteracoes encontradas no Backend. Criando commit...
        git commit -m "Feat: Adiciona endpoint de logs e ajusta fuso horário"
    ) else (
        echo [INFO] Backend: Nenhuma alteracao nova para commitar.
    )
    
    git checkout develop
    git pull origin develop
    git push origin develop
    
    git checkout main
    git pull origin main
    git merge --no-ff develop -m "Release: Endpoint de logs e correções de fuso horário"
    git push origin main
    
    git checkout develop
    cd /d "%ROOT%"
)

echo.
echo ==========================================
echo   PROCESSO CONCLUIDO COM SUCESSO!
echo ==========================================
pause
