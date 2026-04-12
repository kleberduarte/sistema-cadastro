-- Insert initial parameter data for cliente 1
INSERT INTO parametros_cliente (cliente_id, nome_empresa, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto, cor_botao, cor_botao_texto, mensagem_boas_vindas, ativo)
VALUES (1, 'Veltrix', NULL, '#667eea', '#764ba2', '#ffffff', '#333333', '#667eea', '#ffffff', 'Bem-vindo ao Veltrix', true)
ON DUPLICATE KEY UPDATE 
    nome_empresa = VALUES(nome_empresa),
    cor_primaria = VALUES(cor_primaria),
    cor_secundaria = VALUES(cor_secundaria),
    cor_fundo = VALUES(cor_fundo),
    cor_texto = VALUES(cor_texto),
    cor_botao = VALUES(cor_botao),
    cor_botao_texto = VALUES(cor_botao_texto),
    ativo = true;
