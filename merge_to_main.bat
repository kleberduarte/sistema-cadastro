@echo off
cd /d c:\Users\klebe\Desktop

echo === Verificando branches ===
git branch -a

echo.
echo === Fazendo checkout para main ===
git checkout main

echo.
echo === Fazendo merge da blackboxai/venda-api-integration para main ===
git merge blackboxai/venda-api-integration

echo.
echo === Verificando status ===
git status

echo.
echo === Branches restantes ===
git branch

pause
