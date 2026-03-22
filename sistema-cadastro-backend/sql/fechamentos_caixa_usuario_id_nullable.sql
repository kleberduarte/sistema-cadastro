-- Necessário em produção (spring.jpa.hibernate.ddl-auto=validate) antes de deploy
-- que permita desvincular fechamentos ao excluir usuário. Dev com ddl-auto=update
-- aplica via Hibernate.
ALTER TABLE fechamentos_caixa MODIFY usuario_id BIGINT NULL;
