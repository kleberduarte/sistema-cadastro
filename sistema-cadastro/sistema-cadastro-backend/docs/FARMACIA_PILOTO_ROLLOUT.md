# Piloto e Rollout - Modulo Farmacia

## 1) Preparacao (T-7)

- Selecionar 1 empresa piloto de farmácia.
- Habilitar flags no cadastro de parâmetros da empresa:
  - `moduloFarmaciaAtivo=true`
  - `farmaciaLoteValidadeObrigatorio=true`
  - `farmaciaControladosAtivo=true` (se aplicável)
  - `farmaciaAntimicrobianosAtivo=true` (se aplicável)
  - `farmaciaPmcAtivo=true`
  - `farmaciaPmcModo=ALERTA` (primeiros dias)
- Cadastrar lotes dos produtos principais via endpoint de lotes.
- Importar base PMC inicial via CSV.

## 2) Shadow mode (primeiros dias)

- Operar com `farmaciaPmcModo=ALERTA`.
- Monitorar:
  - alertas PMC
  - bloqueios de receita/lote
  - erros de fechamento de venda
- Conferir auditoria em `/api/farmacia/auditoria`.

## 3) Go/No-Go

Promover para bloqueio (`farmaciaPmcModo=BLOQUEIO`) quando:

- Erros críticos de venda = 0 por 3 dias.
- Sem divergências relevantes em lote/validade.
- Equipe treinada nos campos de receita.

## 4) Expansao (waves)

- Wave 1: 2-3 farmácias.
- Wave 2: 5+ farmácias.
- Manter empresas não-farmácia com módulo desligado.

## 5) Critérios de regressão

- Rotinas das empresas não-farmácia devem continuar inalteradas.
- Endpoints de farmácia só devem impactar tenants com flags ligadas.

## 6) PMC automático (opcional)

Configurar variáveis no backend:

- `PMC_SYNC_ENABLED=true`
- `PMC_SYNC_URL=https://.../arquivo-pmc.csv`
- `PMC_SYNC_TOKEN=...` (se a fonte exigir autenticação)
- `PMC_SYNC_CRON=0 0 3 * * *` (horário do sync)

Disparo manual por API (admin):

- `POST /api/farmacia/pmc/sync?empresaId={id}`
