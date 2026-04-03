# Matriz de Regras - Modulo Farmacia

Este documento define o baseline de regras para operacao de farmacias no sistema sem impactar outros tenants.

## Escopo fase 1 (operacional)

- Controle por empresa via flags em `parametros_empresa`.
- Classificacao de produto farmaceutico.
- Validacao de lote/validade e dados de receita no PDV.
- Validacao de PMC em modo alerta ou bloqueio.
- Trilha de auditoria de movimentos relevantes.

## Matriz por tipo de produto

| Tipo | Exige receita | Exige lote | Exige validade | Regra de venda |
|---|---|---|---|---|
| Comum | Nao | Configuravel | Configuravel | Fluxo padrao |
| Antimicrobiano | Sim | Sim | Sim | Capturar receita e lote; bloquear sem dados |
| Controlado | Sim | Sim | Sim | Capturar receita completa e lote; bloquear sem dados |

## Campos minimos de receita (fase 1)

- Tipo de receituario.
- Numero da receita.
- Nome do prescritor.
- Documento do prescritor (texto livre validado por tamanho).
- Data da receita.

## Regras de PMC

- `ALERTA`: permite venda acima do PMC e registra auditoria.
- `BLOQUEIO`: impede venda acima do PMC.
- Fonte de PMC para compliance: base regulatória importada em `pmc_referencias` (ex.: ABC Farma/CMED).
- O campo `produto.pmc` é auxiliar/cadastro e não é a fonte de validação regulatória.
- Sempre registrar:
  - preco de venda
  - pmc vigente
  - acao tomada (alerta ou bloqueio)

## Criterios de aceite

1. Tenant sem modulo farmacia ativo nao sofre alteracao funcional.
2. Tenant farmacia com flags ativas recebe bloqueios e validacoes esperadas.
3. Itens antimicrobiano/controlado sem receita/lote nao finalizam venda.
4. Validacao PMC respeita politica por empresa (`ALERTA`/`BLOQUEIO`).
5. Todo bloqueio/alerta relevante gera evento de auditoria.
