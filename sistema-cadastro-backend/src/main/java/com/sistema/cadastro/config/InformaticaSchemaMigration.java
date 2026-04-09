package com.sistema.cadastro.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@ConditionalOnProperty(value = "app.startup.migrations.enabled", havingValue = "true", matchIfMissing = true)
public class InformaticaSchemaMigration {
    private static final Logger log = LoggerFactory.getLogger(InformaticaSchemaMigration.class);

    private static void safeExec(JdbcTemplate jdbc, String sql) {
        try {
            jdbc.execute(sql);
        } catch (Exception e) {
            String m = e.getMessage() == null ? "" : e.getMessage();
            if (m.contains("Duplicate column name") || m.contains("already exists") || m.contains("Duplicate key name")) {
                log.debug("Migração já aplicada: {}", m);
                return;
            }
            log.warn("Falha em migração de informática: {}", m);
        }
    }

    @Bean
    @Order(5)
    ApplicationRunner informaticaSchemaRunner(JdbcTemplate jdbc) {
        return args -> {
            safeExec(jdbc, "ALTER TABLE parametros_empresa ADD COLUMN modulo_informatica_ativo BIT NULL");
            safeExec(jdbc, "UPDATE parametros_empresa SET modulo_informatica_ativo=0 WHERE modulo_informatica_ativo IS NULL");

            safeExec(jdbc, "CREATE TABLE ordens_servico (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                    "empresa_id BIGINT NOT NULL," +
                    "numero_os BIGINT NOT NULL," +
                    "cliente_id BIGINT NULL," +
                    "nome_cliente VARCHAR(180) NULL," +
                    "contato_cliente VARCHAR(120) NULL," +
                    "equipamento VARCHAR(140) NOT NULL," +
                    "marca VARCHAR(80) NULL," +
                    "modelo VARCHAR(120) NULL," +
                    "numero_serie VARCHAR(120) NULL," +
                    "defeito_relatado TEXT NULL," +
                    "diagnostico TEXT NULL," +
                    "servico_executado TEXT NULL," +
                    "tecnico_responsavel VARCHAR(120) NULL," +
                    "observacao TEXT NULL," +
                    "valor_servico DECIMAL(10,2) NULL," +
                    "desconto DECIMAL(10,2) NULL," +
                    "valor_total DECIMAL(10,2) NULL," +
                    "status VARCHAR(30) NOT NULL," +
                    "data_abertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                    "data_previsao_entrega TIMESTAMP NULL," +
                    "data_conclusao TIMESTAMP NULL," +
                    "data_entrega TIMESTAMP NULL," +
                    "venda_id BIGINT NULL," +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
            safeExec(jdbc, "CREATE UNIQUE INDEX uk_os_empresa_numero ON ordens_servico (empresa_id, numero_os)");
            safeExec(jdbc, "CREATE INDEX idx_os_empresa_status_data ON ordens_servico (empresa_id, status, data_abertura)");
            safeExec(jdbc, "CREATE INDEX idx_os_empresa_cliente ON ordens_servico (empresa_id, nome_cliente)");
        };
    }
}
