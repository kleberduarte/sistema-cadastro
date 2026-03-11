# TODO - Correção de Baixa de Estoque

## Problema
Quando é feita uma venda, o produto não está sendo baixado no estoque.

## Solução Aplicada

### 1. Correção em VendaService.java
- **Arquivo**: `sistema-cadastro-backend/src/main/java/com/sistema/cadastro/service/VendaService.java`
- **Problema identificado**: A lógica anterior tinha uma condição que verificava `produto.getTipo() != null` e deletava o produto quando o estoque chegava a zero, o que podia causar comportamentos inesperados.
- **Correção**: Simplificada a lógica para sempre decrementar o estoque e salvar o produto, sem exclusão automática.

### 2. Compilação
- **Status**: ✅ Compilação bem-sucedida

## Próximos Passos
1. ~~Reiniciar o backend para aplicar as alterações~~ - ✅ Concluído
2. ~~Testar a realização de uma venda para verificar se o estoque é decrementado corretamente~~ - ✅ Testado e funcionando
3. ~~Correção filtro relatórios~~ - ✅ Correção aplicada
4. ~~Correção botão Aplicar desconto~~ - ✅ Correção aplicada (carrinho vazio e valor obrigatório)
5. Sistema de Parametrização por Cliente - ✅ Concluído
   - Backend: Entity, Repository, Service, Controller ✅
   - Frontend: config.js e parametros.html ✅
   - Menu "Parâmetros" adicionado (visível apenas para admin) ✅
   - Como usar:
     1. Alterar `CLIENTE_ID` em `config.js` (1 = Adidas, 2 = Nike, etc)
     2. Acessar `parametros.html` para configurar cores, logo e nome da empresa
     3. Clicar em "Testar Estilos" para aplicar temporariamente via localStorage
     4. As páginas principais já carregam `config.js` automaticamente

