# Índices na tabela `produtos`

Objetivo: manter **listagem paginada** e **categorias por empresa** rápidas, sem mudar regras de negócio.

## Já existentes

- `uk_produto_empresa_codigo` — `(empresa_id, codigo_produto)` (único; também acelera busca por código na empresa)
- `idx_produtos_empresa` — `(empresa_id)`

## Criados automaticamente na subida da aplicação

Classe: `ProdutoIndexSchemaMigration` (ordem 3, após multi-tenant).

| Índice | Colunas | Uso |
|--------|---------|-----|
| `idx_produtos_empresa_id` | `(empresa_id, id)` | Listagem paginada com `ORDER BY id DESC` por empresa |
| `idx_produtos_empresa_categoria` | `(empresa_id, categoria)` | `DISTINCT categoria` e filtros por categoria no escopo da empresa |

Se o índice já existir no MySQL, a criação é ignorada (sem falha de startup).

## Busca com `LIKE '%texto%'`

Consultas com curinga no início **não usam bem índice B-Tree**. Para bases muito grandes, avaliar `FULLTEXT` (MySQL) ou estratégia de busca por prefixo em campos específicos.

## Script manual (opcional)

Ver `sql/indices_produtos_performance.sql` se preferir aplicar fora da aplicação.
