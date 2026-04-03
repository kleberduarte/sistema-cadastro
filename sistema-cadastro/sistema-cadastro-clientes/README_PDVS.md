# PDV desacoplado e monitoramento

## Fluxo rápido

1. **Retaguarda → Parâmetros:** cadastre a empresa (ex.: ID `1`) e **carregue** no combo ou **salve** — isso define a **empresa ativa**.
2. **Retaguarda → PDVs (empresa):** lista PDVs da empresa. Caixas **novos** surgem no **1º login** em `pdv/login.html` (usuário cadastrado + código ex. `01`). **Novo PDV** na retaguarda continua disponível para cadastro manual ou ajuste de nome.
3. **PDV:** `pdv/login.html` → só **usuário e senha**. A **empresa** vem do cadastro do usuário (**ID empresa PDV** em Usuários; vazio = `app.pdv.empresa-padrao-id`, ex. 1). O **código do caixa** é **sequencial automático** (01, 02…) na 1ª vez naquele equipamento; o navegador reutiliza o mesmo caixa depois. **Monitor PDVs:** editar código, nome e ativo.
4. Com o PDV aberto, o painel **PDVs (empresa)** mostra **bolinha verde** (último sinal &lt; 90 s). Fechou o PDV → após ~90 s fica **vermelha**.

## URLs

| Uso | Caminho |
|-----|---------|
| Login do PDV | `pdv/login.html` |
| Frente de caixa | `pdv/` ou `pdv/index.html` |
| Login retaguarda | `login.html` |
| Monitor PDVs (só admin) | `pdvs-monitor.html` |

O arquivo `vendas.html` na raiz só redireciona para `pdv/`.

## API (backend)

- `POST /api/pdv/entrar-inteligente` — login PDV: empresa pelo usuário + terminal existente (cookie local) ou **novo código auto** (autenticado)
- `POST /api/pdv/vincular-ou-registrar` — fluxo manual legado (empresa + código + nome)
- `PUT /api/admin/pdv-terminais/{id}?empresaId=` — editar PDV
- `POST /api/pdv/vincular` — só vincula se o PDV já existir (404 se não houver)
- `POST /api/pdv/heartbeat` — corpo `{ "terminalId": 1 }` a cada ~25 s (automático no PDV)
- `GET /api/admin/pdv-terminais?empresaId=1` — lista + status online (admin)
- `POST /api/admin/pdv-terminais` — criar terminal
- `DELETE /api/admin/pdv-terminais/{id}` — excluir

Tabela criada automaticamente: `pdv_terminais`.
