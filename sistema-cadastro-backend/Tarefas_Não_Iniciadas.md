# Tarefas_Não_Iniciadas

Lista de funcionalidades sugeridas para o sistema de cadastro/PDV. Implementar **uma de cada vez** quando for seguir.

---

## Alta prioridade (impacto direto no dia a dia)

1. **Fechamento de caixa (conferência)**
   - Ao “Fechar caixa” (Alt+F): resumo do dia (vendas em dinheiro, cartão, PIX, número de vendas).
   - Opcional: informar valor em dinheiro no caixa e calcular “sobra/falta”.
   - Registrar um “fechamento” (data/hora, totais) para histórico.

2. **Estoque mínimo e alertas**
   - Campo “estoque mínimo” no produto.
   - Lista ou indicador: “produtos abaixo do mínimo”.
   - Aviso ao adicionar no PDV produto com estoque baixo.

3. **Impressão automática do cupom**
   - Após finalizar a venda, enviar para impressora térmica (via navegador ou app local).

---

## Média prioridade (organização e controle)

4. **Dashboard simples**
   - Tela inicial (ADM): vendas de hoje, desta semana, produtos mais vendidos, gráfico de vendas por dia.

5. **Movimentação de estoque**
   - Entrada de mercadoria (aumentar estoque) com motivo (compra, devolução, ajuste).
   - Histórico de movimentações por produto (opcional).

6. **Promoções / preço promocional**
   - Por produto: preço promocional com data início/fim, ou “em promoção”.
   - Ou descontos por faixa de quantidade (ex.: leve 3, pague 2).
   - No PDV: usar preço normal ou promocional conforme regra.

7. **NFC-e / integração fiscal (futuro)**
   - Integração com emissor de NFC-e (API do fornecedor), se obrigatório no estado.

---

## Melhorias de usabilidade e operação

8. **Atalhos e PDV**
   - Tecla para “aplicar desconto percentual rápido” (ex.: 5%, 10%).
   - Tecla para “repetir último item”.

9. **Vendas em modo offline (opcional)**
    - Salvar vendas em fila local (IndexedDB/localStorage) e enviar ao backend quando reconectar.
    - Tela de “vendas pendentes”.

10. **App mobile (PWA ou nativo)**
    - PWA para consulta de preços, vendas simples, estoque no celular.

11. **Backup / exportação de dados**
    - Exportar clientes, produtos e vendas (CSV/Excel) para backup.
    - Botão em Parâmetros ou Relatórios (ADM).

---

## Ordem sugerida para começar

- **Curto prazo:** Fechamento de caixa.
- **Depois:** Estoque mínimo e alertas + Dashboard.
- **Em seguida:** Entrada de estoque + Preço promocional.

---

*Palavra-chave: **Tarefas_Não_Iniciadas** — usar para localizar esta lista.*
