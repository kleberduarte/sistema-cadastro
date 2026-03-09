@echo off
cd /d c:\Users\klebe\Desktop

echo === Pull com允许不相关历史 ===
git pull origin main --allow-unrelated-histories

echo.
echo === Verificando status ===
git status

echo.
echo === Adicionando arquivos ===
git add .

echo.
echo === Fazendo commit do merge ===
git commit -m "Merge: integracao API de vendas"

echo.
echo === Push para main ===
git push origin main

echo.
echo === Excluindo branch blackboxai ===
git branch -d blackboxai/venda-api-integration
git push origin --delete blackboxai/venda-api-integration

echo.
echo === Branches finais ===
git branch

pause
