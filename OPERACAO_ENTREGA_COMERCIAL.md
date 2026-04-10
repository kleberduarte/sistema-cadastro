# Operacao de Entrega Comercial

Este guia prepara uma base limpa para apresentacao/venda sem quebrar os fluxos principais.

## 1) Backup obrigatorio
- Exportar banco atual antes de qualquer limpeza.
- Exemplo: `mysqldump -u root -p athos > backup_antes_entrega.sql`

## 2) Reset comercial do banco
- Script: `sistema-cadastro-backend/scripts/reset_ambiente_comercial.sql`
- Efeito:
  - remove dados transacionais e operacionais;
  - mantem apenas 1 usuario no sistema;
  - normaliza esse usuario para `adm.super` com role `ADM`.

## 3) Validacao de fluxo (smoke)
- Backend:
  - login em `/api/auth/login`
  - listagens basicas (clientes/produtos/vendas)
- Frontend:
  - `login.html`
  - navegacao principal (`index.html`)
  - telas de cadastro sem erro de permissao para `ADM`

## 4) Performance smoke test
- Script: `sistema-cadastro-backend/scripts/performance_smoke_test.ps1`
- Exemplo:
  - `.\sistema-cadastro-backend\scripts\performance_smoke_test.ps1 -BaseUrl "http://127.0.0.1:8080" -Username "adm.super" -Password "SUA_SENHA" -Requests 200 -Concurrency 20`
- Resultado esperado:
  - Health = `UP`
  - Erros proximo de zero
  - Latencia media e p95 estaveis entre execucoes

## 5) Higiene antes de apresentar
- Conferir `api-config.js` apontando para endpoint correto do ambiente demo/producao.
- Remover credenciais fixas de arquivos locais e usar variaveis de ambiente.
- Garantir CORS apenas para dominios oficiais da demonstracao.

## 6) Execucao unica (go-live)
- Script unico na raiz: `go_live_comercial.ps1`
- Ele executa:
  - backup do banco;
  - reset comercial;
  - validacao de health/login;
  - performance smoke;
  - geracao de relatorio em `relatorios-go-live`.
- Exemplo:
  - `.\go_live_comercial.ps1 -DbHost "127.0.0.1" -DbPort 3306 -DbName "athos" -DbUser "root" -DbPassword "SENHA_DB" -BaseUrl "http://127.0.0.1:8080" -AdminUser "adm.super" -AdminPassword "SENHA_ADM" -PerfRequests 200 -PerfConcurrency 20`
- Caso MySQL nao esteja no PATH, informe a pasta bin:
  - `.\go_live_comercial.ps1 -MySqlBinDir "C:\Program Files\MySQL\MySQL Server 8.0\bin" -DbPassword "SENHA_DB" -AdminPassword "SENHA_ADM"`
- O script tambem tenta detectar automaticamente:
  - `%MYSQL_HOME%\bin`
  - `C:\Program Files\MySQL\MySQL Server *\bin`
  - `C:\Program Files (x86)\MySQL\MySQL Server *\bin`
