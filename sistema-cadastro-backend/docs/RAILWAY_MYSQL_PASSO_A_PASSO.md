# Ação 1: MySQL no Railway — Passo a passo

Objetivo: criar uma instância MySQL no Railway e obter o `DB_URL` para o Spring Boot em produção.

---

## 1. Conta e projeto no Railway

1. Acesse [railway.app](https://railway.app) e faça login (GitHub ou e-mail).
2. Clique em **"New Project"**.
3. Na tela de criação:
   - Selecione **"Deploy from GitHub repo"** (opcional, para o backend depois), **ou**
   - Escolha **"Empty Project"** para começar apenas com o banco.

---

## 2. Adicionar o serviço MySQL

1. No projeto criado, clique em **"+ New"** (ou **"Add Service"**).
2. Em **"Database"**, selecione **"Add MySQL"**.
3. O Railway vai criar e provisionar a instância MySQL em poucos segundos.

---

## 3. Obter as variáveis de conexão

1. Clique no serviço **MySQL** que apareceu no dashboard.
2. Abra a aba **"Variables"** (ou **"Connect"**).
3. O Railway costuma expor, por exemplo:
   - `MYSQL_URL` — URL completa de conexão (pode já vir em formato JDBC ou URI)
   - ou variáveis separadas: `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

**Exemplo de `MYSQL_URL`:**
```
mysql://usuario:senha@containers-us-west-xxx.railway.app:6543/railway
```

---

## 4. Montar o `DB_URL` para o Spring Boot

O Spring Boot espera uma URL JDBC no formato:

```
jdbc:mysql://HOST:PORTA/NOME_DB?useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=America/Sao_Paulo
```

**Conversão da `MYSQL_URL` do Railway:**

| Railway (exemplo)                | JDBC equivalente                                   |
|----------------------------------|----------------------------------------------------|
| `mysql://user:pass@host:6543/db` | `jdbc:mysql://host:6543/db?useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=America/Sao_Paulo` |

**Observações:**
- Substitua `host`, `6543`, `db` pelos valores reais do Railway.
- Se a senha tiver caracteres especiais (`@`, `#`, `:`, etc.), eles devem ser [codificados em URL](https://en.wikipedia.org/wiki/Percent-encoding) (ex.: `@` → `%40`).
- O Railway usa conexão pública via internet; `useSSL=true` ajuda na segurança.

---

## 5. Variáveis que você precisará configurar

Depois de montar a URL, anote:

| Variável       | Exemplo (NÃO use em produção)                                                                 |
|----------------|-----------------------------------------------------------------------------------------------|
| `DB_URL`       | `jdbc:mysql://host.railway.app:6543/railway?useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=America/Sao_Paulo` |
| `DB_USER`      | Valor de `MYSQLUSER` ou o usuário da URL                                                      |
| `DB_PASSWORD`  | Valor de `MYSQLPASSWORD` ou a senha da URL                                                    |

---

## 6. Garantir o schema antes da primeira subida

O perfil `prod` usa `spring.jpa.hibernate.ddl-auto=validate`, ou seja, o banco **já deve existir** com as tabelas criadas.

**Opções:**

### A) Primeira vez (schema vazio)

1. Rode o backend **uma vez** em **dev** contra o MySQL do Railway:
   - Configure `DB_URL`, `DB_USER`, `DB_PASSWORD` com os valores do Railway.
   - Use `spring.profiles.active=dev` (ou sem profile) e `ddl-auto=update` para criar as tabelas.
2. Depois, troque para `prod` e `ddl-auto=validate` para o deploy definitivo.

### B) Exportar schema do banco local e importar no Railway

1. Exporte as tabelas do MySQL local (ex.: `mysqldump --no-data`).
2. Conecte ao MySQL do Railway e importe o schema (via cliente MySQL ou interface web, se disponível).

---

## 7. Checklist da Ação 1

- [ ] Projeto Railway criado
- [ ] Serviço MySQL adicionado e em execução
- [ ] `DB_URL`, `DB_USER`, `DB_PASSWORD` anotados em local seguro
- [ ] Schema validado (tabelas existem) ou planejada execução inicial em dev

---

**Próxima ação:** Deploy do backend com essas variáveis (Ação 2).
