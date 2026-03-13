# TODO - Implementação de Formas de Pagamento no PDV

## Tarefas

### Backend
- [ ] Testar backend
- [x] Start project: Run backend successfully

### Frontend
- [ ] Testar fluxo completo
- [x] ✅ Gerar QRCode PIX ao selecionar PIX na tela de pagamento
- [x] ✅ Corrigido bug: Confirmar pagamento PIX sem pedir chave novamente
- [x] Ajustar tela de parâmetros para usar chave PIX default quando campo estiver vazio
- [x] Corrigir valor do QRCode PIX em pagamento parcial (usar apenas valor restante)
- [ ] Incluir no comprovante: forma de pagamento, valor recebido em dinheiro e troco
- [ ] Exibir troco em tempo real na tela de pagamento (dinheiro)

## Progresso
- [x] Plano aprovado
- [x] Novo ajuste solicitado: permitir cadastro de chave PIX com opção default do sistema em Parâmetros
- [x] Backend: Atualizar entidade Venda
- [x] Backend: Atualizar VendaRequest DTO
- [x] Backend: Atualizar VendaResponse DTO
- [x] Backend: Atualizar VendaService
- [x] Frontend: Adicionar modal de pagamento em vendas.html
- [x] Frontend: Adicionar QRCode.js via CDN
- [x] Frontend: Atualizar vendas.js (lógica + QRCode PIX + bug fix fluxo PIX)
- [x] Frontend: Atualizar styles.css (estilos do modal)
- [x] Frontend: Corrigir vendas.js para gerar QR PIX com valor restante em pagamentos parciais

**Fluxo PIX OK:** Selecione PIX → digite chave → QR gerado → botão Confirmar habilitado diretamente → venda salva!
