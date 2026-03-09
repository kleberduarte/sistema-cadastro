# Script para resolver merge e fazer push
Set-Location c:\Users\klebe\Desktop

Write-Host "=== Pull com allow-unrelated-histories ===" -ForegroundColor Cyan
git pull origin main --allow-unrelated-histories

Write-Host "`n=== Verificando status ===" -ForegroundColor Cyan
git status

Write-Host "`n=== Adicionando arquivos ===" -ForegroundColor Cyan
git add .

Write-Host "`n=== Fazendo commit do merge ===" -ForegroundColor Cyan
git commit -m "Merge: integracao API de vendas"

Write-Host "`n=== Push para main ===" -ForegroundColor Cyan
git push origin main

Write-Host "`n=== Excluindo branch blackboxai ===" -ForegroundColor Cyan
git branch -d blackboxai/venda-api-integration
git push origin --delete blackboxai/venda-api-integration

Write-Host "`n=== Branches finais ===" -ForegroundColor Cyan
git branch

Write-Host "`nConcluido!" -ForegroundColor Green
