# Produção — retomada do plano (pós-release candidata)

Este documento conecta o que já está definido (`RELEASE_CANDIDATE.md`, `STAGING_CHECKLIST.md`) aos **próximos passos práticos** de deploy.

## Onde estamos

- Código em `develop` / `main` com perfil `prod`, JWT, CORS e rate limit alinhados ao checklist.
- **Frontend:** URL da API centralizada em `sistema-cadastro-clientes/api-config.js` (na raiz do repositório Git = pasta `sistema-cadastro`) — **ajuste esse arquivo** (ou injete `window.API_URL` antes dele) no ambiente real.

## Ordem sugerida (produção)

### 1) Banco de dados (ex.: Railway ou Render MySQL)

- **Railway:** [docs/RAILWAY_MYSQL_PASSO_A_PASSO.md](docs/RAILWAY_MYSQL_PASSO_A_PASSO.md)
- **Render (MySQL privado + API no mesmo workspace):** [docs/RENDER_MYSQL_PASSO_A_PASSO.md](docs/RENDER_MYSQL_PASSO_A_PASSO.md)

Resumo:
1. Criar instância MySQL e obter host, porta, usuário, senha e nome do banco.
2. Montar o JDBC, por exemplo:
   `jdbc:mysql://HOST:PORTA/NOME_DB?useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=America/Sao_Paulo`
3. Rodar migrations / schema conforme o projeto (Hibernate `validate` em prod — garantir que o schema está aplicado antes da subida).

### 2) Backend (API)

1. Build: `mvn -q clean package -DskipTests` → JAR em `target/`.
2. Variáveis de ambiente obrigatórias (perfil `prod`):
   - `SPRING_PROFILES_ACTIVE=prod`
   - `DB_URL`, `DB_USER`, `DB_PASSWORD`
   - `JWT_SECRET` — **mínimo 32 bytes** (string longa e aleatória)
   - `CORS_ALLOWED_ORIGINS` — origens exatas do front (ex.: `https://app.seudominio.com`, sem barra final; várias separadas por vírgula se necessário)
3. Opcional: `JWT_EXPIRATION` (default 86400000 ms).
4. Publicar o JAR no provedor escolhido (VPS, Railway, Render, etc.) e anotar a **URL HTTPS** da API (ex.: `https://api.seudominio.com`).

### 3) Frontend (estático)

1. Editar **`api-config.js`**: definir `API_URL` como `https://api.seudominio.com/api` (mesmo host/porta do backend + `/api`).
2. Hospedar a pasta do front (Netlify, Vercel, S3+CloudFront, nginx no mesmo VPS, etc.) com **HTTPS**.
3. Em **`CORS_ALLOWED_ORIGINS`** no backend, incluir a origem exata do site (ex.: `https://app.seudominio.com`).

### 4) Homologação (antes do go-live)

Seguir **`STAGING_CHECKLIST.md`**: smoke test (login, cliente, produto, venda, fechamento), checagem de `empresa_id` entre tenants, e observabilidade mínima (logs/erros 5xx).

### 5) Pós go-live

- Monitorar erros e latência.
- Manter **feature freeze** da RC até estabilizar; apenas hotfix conforme `RELEASE_CANDIDATE.md`.

### 6) PMC com fonte regulatória (ABC Farma)

O endpoint manual `POST /api/farmacia/pmc/sync?empresaId={id}` agora suporta CSV e JSON.

#### Cenário A: URL que retorna CSV (GET)

Variáveis:

- `PMC_SYNC_URL=https://seu-endpoint/pmc.csv`
- `PMC_SYNC_FORMAT=csv` (ou `auto`)
- `PMC_SYNC_METHOD=GET`
- `PMC_SYNC_ENABLED=true` (necessário para job automático; sync manual funciona sem isso)

#### Cenário B: Web Service JSON autenticado (ex.: integração ABC via endpoint intermediário)

Variáveis:

- `PMC_SYNC_URL=https://seu-endpoint/pmc-json`
- `PMC_SYNC_FORMAT=json`
- `PMC_SYNC_METHOD=GET` ou `POST`
- `PMC_SYNC_AUTH_HEADER=Authorization`
- `PMC_SYNC_TOKEN=SEU_TOKEN`
- `PMC_SYNC_TOKEN_PREFIX=Bearer `
- `PMC_SYNC_POST_BODY=...` (somente quando método = POST)

Exemplo de `PMC_SYNC_POST_BODY` (form-urlencoded):

`cnpj_cpf=00000000000000&senha=SECRETO&cnpj_sh=00000000000000&pagina=1`

> Observação: a ABC Farma geralmente exige credenciais e fluxo de webservice próprio; em produção, use endpoint autorizado/contratado.

#### Teste rápido pós-configuração

1. `POST /api/farmacia/pmc/sync?empresaId=3`
2. Esperado: JSON com `importados` e `pmcProdutosAtualizados`.
3. Conferir auditoria: `GET /api/farmacia/auditoria?empresaId=3` com evento `PMC_IMPORT_MANUAL`.

## Checklist rápido

| Item | OK? |
|------|-----|
| `api-config.js` com URL da API de produção | ☐ |
| `CORS_ALLOWED_ORIGINS` = origem do front | ☐ |
| `JWT_SECRET` forte (≥32 bytes) | ☐ |
| MySQL acessível pelo backend | ☐ |
| HTTPS no front e na API | ☐ |
| Smoke test completo em staging | ☐ |

## Checklist “fazer tudo” (Render + Aiven + front)

Use após subir o código mais recente em `main` (ex.: validação de logo, import em batch).

### A) Banco (Aiven / MySQL)

1. Colunas de suporte, se ainda não existirem: `suporte_email`, `suporte_whatsapp` em `parametros_empresa`.
2. **`DB_URL`** do backend: incluir `rewriteBatchedStatements=true` (importação grande em lote). Exemplo de sufixo:  
   `&rewriteBatchedStatements=true`
3. **Opcional:** rodar `scripts/limpar_logo_urls_invalidos.sql` se ainda houver `logo_url` com `C:\...` ou `file:` — ou corrigir manualmente para uma URL `https://` pública.

### B) Backend (Render — Web Service)

1. **Manual Deploy** → último commit de `main`.
2. Conferir env: `SPRING_PROFILES_ACTIVE=prod`, `DB_*`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS` (URL exata do static, sem barra no fim).
3. Logs: serviço sobe sem erro; testar login na API (Swagger ou `POST /api/auth/login`).

### C) Frontend (Render — Static Site)

1. **Manual Deploy** (ou deploy automático do mesmo repositório/branch).
2. Abrir o site em aba anônima ou após atualizar o PWA: service worker novo (`v7`) deve puxar `config.js` e telas novas.

### D) Testes manuais no navegador

1. **Login** retaguarda com `?empresaId=`.
2. **Parâmetros:** salvar com logo `https://...`; tentar `C:\...` → deve bloquear; e-mail/WhatsApp de suporte válidos.
3. **Produtos:** import CSV grande (se aplicável) sem timeout.
4. **PDV** (e PDV login): logo e cores da empresa.
5. **Suporte:** tela `suporte.html` e links do menu.

### E) PWA (celular)

1. Reinstalar/atualizar o atalho após o deploy (ou limpar dados do site).
2. Conferir ícone e telas principais.

## Render: “Port scan timeout / no open ports”

O Render exige que o processo **escute na variável `PORT`** dentro do tempo do health check. Se os logs param antes de aparecer algo como **Tomcat started on port …**:

1. Confirme **`SPRING_PROFILES_ACTIVE=prod`** e que **`server.port`** usa `PORT` (já configurado nas `application*.properties`).
2. **Memória:** em planos ~512 MB, heap muito alto pode causar OOM na subida sem log claro. O `Dockerfile` limita o heap para deixar margem ao JRE.
3. **Plano / cold start:** primeira subida após build pode demorar; se ainda falhar, aumente o tipo de instância ou veja na documentação do Render o tempo máximo do primeiro health check.

## Referências

- `RELEASE_CANDIDATE.md` — freeze e variáveis.
- `STAGING_CHECKLIST.md` — validação antes do corte.
- `src/main/resources/application-prod.properties` — perfil prod.
