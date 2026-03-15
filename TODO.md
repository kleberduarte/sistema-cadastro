# TODO - Status do Sistema de PDV e Cadastro

## PDV (vendas)
- [x] Backend: adicionar busca por código do produto no repositório
- [x] Backend: adicionar serviço para buscar produto por código
- [x] Backend: adicionar endpoint GET /api/produtos/codigo/{codigo}
- [x] Frontend: adicionar UI de leitura de código em vendas.html
- [x] Frontend: adicionar lógica de leitura/manual + Enter em vendas.js
- [x] Frontend: integrar adição ao carrinho por código
- [x] Testar fluxo crítico sem leitor físico (confirmado pelo usuário)
- [x] Automação: Focar cursor no código de barras ao carregar página e após cada venda
- [x] Automação: Fechar modal de comprovante automaticamente após a impressão
- [x] Pagamentos: Implementar lógica de múltiplos pagamentos parciais
- [x] Financeiro: Integração de PIX dinâmico com QR Code e função "Copia e Cola"

## Impressão Térmica
- [x] Implementar layout de cupom para impressoras de 80mm (área útil 72mm)
- [x] Otimizar CSS `@media print` para ocultar botões e menus no papel
- [x] Ajustar fontes e alinhamento de colunas para padrão PDV

## Cadastro de Produto
- [x] Frontend: adicionar UI de leitor em produtos.html
- [x] Frontend: adicionar lógica de preenchimento por código em produtos.js
- [x] Frontend: manter cadastro manual e validações existentes
- [x] Testar fluxo crítico sem leitor físico (digitação + Enter/botão)
- [x] Validação: Checar duplicidade de código de barras no Frontend e Backend

## Identidade Visual e Configurações
- [x] Carregamento dinâmico de Logo (Header/Login) e cores por Empresa
- [x] Injeção de estilos CSS personalizados baseados nos parâmetros da API

## DevOps e Automação
- [x] Script `atualizar_projeto.bat` para sincronização automática de branches
- [x] Script `verificar_conteudo.bat` para validação de integridade do código
- [x] Script `verificar_status.bat` com visão gráfica do histórico Git
- [x] Monitoramento: Implementar sistema de logs de passos do usuário (Frontend e Backend)

## Backlog / Próximos Passos
- [ ] UI: Adicionar logotipo da empresa no topo do comprovante térmico
- [ ] UX: Implementar atalhos de teclado (ex: F10 para finalizar venda)
- [ ] Fiscal: Pesquisa e arquitetura para NFC-e / SAT (Aplicação Ponte)
