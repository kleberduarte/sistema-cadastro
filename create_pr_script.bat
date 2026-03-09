@echo off
REM Script para criar Pull Request

echo.
echo ========================================
echo PASSO 1: Adicionando arquivos...
echo ========================================
git add sistema-cadastro-backend\src\main\java\com\sistema\cadastro\model\Venda.java
git add sistema-cadastro-backend\src\main\java\com\sistema\cadastro\model\VendaItem.java
git add sistema-cadastro-backend\src\main\java\com\sistema\cadastro\repository\VendaRepository.java
git add sistema-cadastro-backend\src\main\java\com\sistema\cadastro\dto\VendaRequest.java
git add sistema-cadastro-backend\src\main\java\com\sistema\cadastro\dto\VendaResponse.java
git add sistema-cadastro-backend\src\main\java\com\sistema\cadastro\service\VendaService.java
git add sistema-cadastro-backend\src\main\java\com\sistema\cadastro\controller\VendaController.java
git add sistema-cadastro-backend\scripts\delete_vendas.sql
git add sistema-cadastro-clientes\vendas.js
git add sistema-cadastro-clientes\vendas.html
git add sistema-cadastro-clientes\relatorios.js
git add TODO.md

echo.
echo ========================================
echo PASSO 2: Criando commit...
echo ========================================
git commit -m "feat: API de Vendas integrada ao PDV e Relatorios

- Criada entidade Venda e VendaItem no backend
- Adicionado VendaController com endpoints REST
- PDV agora carrega vendas de hoje da API
- Corrigido sistema de desconto (botao Aplicar)
- Adicionado script SQL para excluir vendas"

echo.
echo ========================================
echo PASSO 3: Criando branch e push...
echo ========================================
git checkout -b blackboxai/venda-api-integration
git push -u origin blackboxai/venda-api-integration

echo.
echo ========================================
echo PASSO 4: Criando Pull Request...
echo ========================================
gh pr create --base develop --head blackboxai/venda-api-integration --title "feat: API de Vendas integrada ao PDV e Relatorios" --body "Implementacao da API de Vendas com integracao completa ao PDV e Relatorios."

echo.
echo ========================================
echo Concluido!
echo ========================================
pause

