-- =====================================================================
-- ARQUIVO DE QUERIES PRINCIPAIS DO SISTEMA
-- Banco de dados: athos
-- =====================================================================

-- NOTA: Substitua '?' por valores reais ao executar as queries.

-- =====================================================================
-- Tabela: clientes
-- =====================================================================

-- Selecionar todos os clientes
SELECT * FROM athos.clientes;

-- Selecionar um cliente específico por ID
SELECT * FROM athos.clientes WHERE id = ?;

-- Buscar clientes por nome
SELECT * FROM athos.clientes WHERE nome LIKE '%?%';

-- Inserir um novo cliente
INSERT INTO athos.clientes (nome, email, telefone, endereco, cpf) VALUES ('?', '?', '?', '?', '?');

-- Atualizar um cliente
UPDATE athos.clientes SET nome = '?', email = '?', telefone = '?' WHERE id = ?;

-- Excluir um cliente
DELETE FROM athos.clientes WHERE id = ?;

-- =====================================================================
-- Tabela: produtos
-- =====================================================================

-- Selecionar todos os produtos
SELECT * FROM athos.produtos;

-- Selecionar um produto por código de barras/produto
SELECT * FROM athos.produtos WHERE codigo_produto = '?';

-- Atualizar o estoque de um produto após uma venda
UPDATE athos.produtos SET quantidade_estoque = quantidade_estoque - ? WHERE id = ?;

-- =====================================================================
-- Tabela: vendas e venda_itens
-- =====================================================================

-- Selecionar as últimas 50 vendas
SELECT * FROM athos.vendas ORDER BY data_venda DESC LIMIT 50;

-- Selecionar todas as vendas de hoje
SELECT * FROM athos.vendas WHERE DATE(data_venda) = CURDATE();

-- Selecionar itens de uma venda específica
SELECT * FROM athos.venda_itens WHERE venda_id = ?;

-- Excluir uma venda e seus itens (IMPORTANTE: executar em ordem)
DELETE FROM athos.venda_itens WHERE venda_id = ?;
DELETE FROM athos.vendas WHERE id = ?;

-- =====================================================================
-- Tabela: usuarios
-- =====================================================================

-- Selecionar todos os usuários (sem a senha)
SELECT id, username, role, created_at FROM athos.usuarios;

-- =====================================================================
-- Tabela: parametros_empresa
-- =====================================================================

-- Selecionar os parâmetros da empresa ativa (geralmente ID 1 ou o ID configurado)
SELECT * FROM athos.parametros_empresa WHERE id = ?;

-- Atualizar a cor primária ou o logo de uma empresa
UPDATE athos.parametros_empresa SET cor_primaria = '?', logo_url = '?' WHERE id = ?;