# Checklist de Staging (Go-Live)

## 1) Configuracao de ambiente

- Definir `SPRING_PROFILES_ACTIVE=prod`
- Definir `DB_URL`
- Definir `DB_USER`
- Definir `DB_PASSWORD`
- Definir `JWT_SECRET` (minimo 32 bytes)
- Definir `CORS_ALLOWED_ORIGINS` com os dominios reais

## 2) Validacao de subida

- Subir backend e confirmar inicializacao sem erro
- Confirmar endpoint de health/status da API
- Validar que nao ha erro de JWT na inicializacao

## 3) Smoke test funcional

- Login/autorizacao com usuario valido
- CRUD de cliente
- CRUD de produto
- Venda com baixa de estoque
- Fechamento de caixa

## 4) Observabilidade minima

- Verificar taxa de erro HTTP (4xx/5xx)
- Conferir latencia media/p95
- Revisar logs de excecao no backend

## 5) Criterio de aprovacao

- Sem erro critico em login, venda, estoque e fechamento
- Sem vazamento entre empresas (`empresa_id`)
- Sem 5xx sustentado acima do limite operacional
