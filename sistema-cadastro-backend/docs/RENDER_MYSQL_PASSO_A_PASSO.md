# Ação 1 (Render): MySQL no Render — Passo a passo

O Render **não** oferece um botão “MySQL gerenciado” igual ao Railway. O MySQL é implantado como **Private Service** (Docker), com disco persistente. Documentação oficial: [Deploy MySQL – Render](https://docs.render.com/deploy-mysql).

---

## Importante: rede privada

O MySQL no Render fica em um **serviço privado** (`mysql-nome:3306`). Ele **só é acessível por outros serviços na mesma conta Render** (ex.: sua API Spring Boot também hospedada no Render).

- **API no Render + MySQL no Render** → use o hostname **interno** (ex.: `mysql-xyz:3306`).
- **Rodar o backend só no seu PC** apontando para esse MySQL → em geral **não funciona** sem túnel SSH; o ideal é subir a API no Render na **Ação 2** ou usar outro MySQL com IP público.

---

## Opção A — Deploy rápido (template)

1. Abra o template oficial: [MySQL | Render](https://render.com/templates/mysql) (repositório [render-examples/mysql](https://github.com/render-examples/mysql)).
2. Use **Deploy to Render** e siga os passos (nome do serviço, variáveis, disco).
3. Defina variáveis típicas (ajuste nomes e senhas):
   - `MYSQL_DATABASE` — ex.: `athos` ou `railway` (nome do schema)
   - `MYSQL_USER` / `MYSQL_PASSWORD`
   - `MYSQL_ROOT_PASSWORD`

4. Em **Advanced**, **Disk**:
   - **Mount Path:** `/var/lib/mysql` (obrigatório exatamente assim)
   - **Size:** mínimo sugerido 10 GB

5. Aguarde o deploy ficar **Live**. Anote o **nome interno** do serviço (ex.: `mysql-abc123`).

---

## Opção B — Manual (fork do exemplo)

1. Faça fork de [render-examples/mysql](https://github.com/render-examples/mysql) (ou use como template no GitHub).
2. No Render: **New** → **Private Service** → conecte o repositório.
3. **Language:** Docker.
4. Configure as mesmas variáveis e disco da Opção A (ver [Render docs](https://docs.render.com/deploy-mysql)).

---

## Montar o `DB_URL` para o Spring Boot (no Render)

Quando a **API Spring Boot** estiver rodando **como Web Service no mesmo workspace Render**, use o host **interno** do MySQL:

```
jdbc:mysql://NOME_DO_SERVICO_MYSQL:3306/NOME_DO_BANCO?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Sao_Paulo
```

**Exemplos:**

| Campo        | Exemplo                          |
|-------------|-----------------------------------|
| Host        | `mysql-abc123` (nome do serviço, não o domínio público) |
| Porta       | `3306`                            |
| Banco       | Valor de `MYSQL_DATABASE`         |
| `DB_USER`   | `MYSQL_USER`                      |
| `DB_PASSWORD` | `MYSQL_PASSWORD`                |

> `useSSL=false` costuma ser o caso em conexão **interna** entre serviços Render. Se no futuro você usar SSL explícito, ajuste conforme a doc do Render.

---

## Conectar do seu computador (opcional)

Para `mysql` CLI ou ferramentas gráficas, o Render usa **SSH** ou shell no dashboard. Veja [Connecting to MySQL](https://docs.render.com/deploy-mysql) na documentação.

---

## Schema (Hibernate `validate` em prod)

Igual ao plano Railway:

1. Primeira vez: subir o backend **uma vez** com `ddl-auto=update` (dev) ou importar `mysqldump` do ambiente local.
2. Depois: perfil `prod` com `validate`.

---

## Próximo passo

**Ação 2:** criar um **Web Service** no Render com o JAR do Spring Boot, na **mesma conta**, e definir `DB_URL`, `DB_USER`, `DB_PASSWORD` apontando para o MySQL interno.

Guia geral da sequência: `PRODUCAO_DEPLOY.md`.
