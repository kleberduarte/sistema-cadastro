@echo off
setlocal enabledelayedexpansion
echo ==========================================
echo   ATUALIZACAO AUTOMATICA DE BRANCHES
echo ==========================================

if exist "sistema-cadastro-clientes" (
    echo.
    echo [FRONTEND] Processando sistema-cadastro-clientes...
    cd sistema-cadastro-clientes
    
    echo.
    echo [DEBUG] Status do Git ^(arquivos modificados^):
    git status -s
    echo.

    rem Salva alteracoes atuais
    git add --all

    git diff --staged --quiet
    if !errorlevel! neq 0 (
        echo [INFO] Alteracoes encontradas no Frontend. Criando commit...
        git commit -m "Feat: Implementação de recibo térmico 80mm e automação de foco no PDV"
    ) else (
        echo [INFO] Frontend: Nenhuma alteracao nova para commitar. A mudanca pode ja estar no historico ou o arquivo esta sendo ignorado.
    )
    
    rem Atualiza Develop
    git checkout develop
    git pull origin develop
    git push origin develop
    
    rem Atualiza Main
    git checkout main
    git pull origin main
    git merge --no-ff develop -m "Release: Impressão térmica profissional e melhorias de fluxo no PDV"
    git push origin main
    
    rem Volta para Develop
    git checkout develop
    cd ..
)

if exist "sistema-cadastro-backend" (
    echo.
    echo [BACKEND] Processando sistema-cadastro-backend...
    cd sistema-cadastro-backend
    
    git add .
    git diff --staged --quiet
    if !errorlevel! neq 0 (
        echo [INFO] Alteracoes encontradas no Backend. Criando commit...
        git commit -m "Chore: Sincronizacao de projeto"
    ) else (
        echo [INFO] Backend: Nenhuma alteracao nova para commitar.
    )
    
    git checkout develop
    git pull origin develop
    git push origin develop
    
    git checkout main
    git pull origin main
    git merge --no-ff develop -m "Release: Backend Sincronizado"
    git push origin main
    
    git checkout develop
    cd ..
)

echo.
echo ==========================================
echo   PROCESSO CONCLUIDO COM SUCESSO!
echo ==========================================
pause
