-- Scripts para excluir vendas do banco de dados MySQL
-- Execute no banco "athos"

-- Ver todas as vendas
SELECT * FROM athos.vendas;

-- Excluir uma venda específica (substitua 1 pelo ID desejado)
DELETE FROM athos.venda_itens WHERE venda_id = 1;
DELETE FROM athos.vendas WHERE id = 1;

-- Excluir todas as vendas de hoje
DELETE FROM athos.venda_itens WHERE venda_id IN (SELECT id FROM athos.vendas WHERE DATE(data_venda) = CURDATE());
DELETE FROM athos.vendas WHERE DATE(data_venda) = CURDATE();

-- Excluir TODAS as vendas (cuidado!)
DELETE FROM athos.venda_itens;
DELETE FROM athos.vendas;

