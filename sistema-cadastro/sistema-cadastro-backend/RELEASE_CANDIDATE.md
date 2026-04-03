# Release Candidate - Freeze de Features

## Status

- Estado atual: `feature freeze` ativo (somente correcoes e estabilizacao).
- Versao candidata: `backend-1.0.0-rc1`.
- Foco: estabilidade para go-live e validacao em staging/producao.

## Variaveis de producao revisadas

As variaveis abaixo foram validadas para deploy em ambiente Jetio:

- `DB_URL`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `JWT_EXPIRATION` (opcional; default de seguranca mantido)

## Como ativar a configuracao de producao

1. Definir `SPRING_PROFILES_ACTIVE=prod`.
2. Injetar as variaveis obrigatorias no ambiente.
3. Subir a aplicacao e executar smoke test de:
   - login/autorizacao;
   - CRUD cliente/produto;
   - venda e baixa de estoque;
   - fechamento de caixa.

## Regra de freeze

Durante o freeze desta release candidata:

- nao adicionar funcionalidades novas;
- aceitar apenas hotfix, bugfix e ajustes de configuracao;
- toda mudanca deve manter compatibilidade com o banco atual.
