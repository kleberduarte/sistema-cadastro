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
public class FarmaciaSchemaMigration {
    private static final Logger log = LoggerFactory.getLogger(FarmaciaSchemaMigration.class);

    private static void safeExec(JdbcTemplate jdbc, String sql) {
        try {
            jdbc.execute(sql);
        } catch (Exception e) {
            String m = e.getMessage() == null ? "" : e.getMessage();
            if (m.contains("Duplicate column name") || m.contains("already exists") || m.contains("Duplicate key name")) {
                log.debug("Migração já aplicada: {}", m);
                return;
            }
            log.warn("Falha em migração de farmácia: {}", m);
        }
    }

    @Bean
    @Order(4)
    ApplicationRunner farmaciaSchemaRunner(JdbcTemplate jdbc) {
        return args -> {
            safeExec(jdbc, "ALTER TABLE parametros_empresa ADD COLUMN segmento VARCHAR(40) NULL");
            safeExec(jdbc, "ALTER TABLE parametros_empresa ADD COLUMN modulo_farmacia_ativo BIT NULL");
            safeExec(jdbc, "ALTER TABLE parametros_empresa ADD COLUMN farmacia_lote_validade_obrigatorio BIT NULL");
            safeExec(jdbc, "ALTER TABLE parametros_empresa ADD COLUMN farmacia_controlados_ativo BIT NULL");
            safeExec(jdbc, "ALTER TABLE parametros_empresa ADD COLUMN farmacia_antimicrobianos_ativo BIT NULL");
            safeExec(jdbc, "ALTER TABLE parametros_empresa ADD COLUMN farmacia_pmc_ativo BIT NULL");
            safeExec(jdbc, "ALTER TABLE parametros_empresa ADD COLUMN farmacia_pmc_modo VARCHAR(20) NULL");
            safeExec(jdbc, "UPDATE parametros_empresa SET modulo_farmacia_ativo=0 WHERE modulo_farmacia_ativo IS NULL");
            safeExec(jdbc, "UPDATE parametros_empresa SET farmacia_lote_validade_obrigatorio=0 WHERE farmacia_lote_validade_obrigatorio IS NULL");
            safeExec(jdbc, "UPDATE parametros_empresa SET farmacia_controlados_ativo=0 WHERE farmacia_controlados_ativo IS NULL");
            safeExec(jdbc, "UPDATE parametros_empresa SET farmacia_antimicrobianos_ativo=0 WHERE farmacia_antimicrobianos_ativo IS NULL");
            safeExec(jdbc, "UPDATE parametros_empresa SET farmacia_pmc_ativo=0 WHERE farmacia_pmc_ativo IS NULL");
            safeExec(jdbc, "UPDATE parametros_empresa SET farmacia_pmc_modo='ALERTA' WHERE farmacia_pmc_modo IS NULL OR TRIM(farmacia_pmc_modo)=''");

            safeExec(jdbc, "ALTER TABLE produtos ADD COLUMN tipo_controle VARCHAR(30) NULL");
            safeExec(jdbc, "ALTER TABLE produtos ADD COLUMN exige_receita BIT NULL");
            safeExec(jdbc, "ALTER TABLE produtos ADD COLUMN exige_lote BIT NULL");
            safeExec(jdbc, "ALTER TABLE produtos ADD COLUMN exige_validade BIT NULL");
            safeExec(jdbc, "ALTER TABLE produtos ADD COLUMN registro_ms VARCHAR(30) NULL");
            safeExec(jdbc, "ALTER TABLE produtos ADD COLUMN gtin_ean VARCHAR(30) NULL");
            safeExec(jdbc, "ALTER TABLE produtos ADD COLUMN pmc DECIMAL(10,2) NULL");
            safeExec(jdbc, "UPDATE produtos SET tipo_controle='COMUM' WHERE tipo_controle IS NULL");
            safeExec(jdbc, "UPDATE produtos SET exige_receita=0 WHERE exige_receita IS NULL");
            safeExec(jdbc, "UPDATE produtos SET exige_lote=0 WHERE exige_lote IS NULL");
            safeExec(jdbc, "UPDATE produtos SET exige_validade=0 WHERE exige_validade IS NULL");

            safeExec(jdbc, "CREATE TABLE produto_lotes (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                    "empresa_id BIGINT NOT NULL," +
                    "produto_id BIGINT NOT NULL," +
                    "codigo_lote VARCHAR(60) NOT NULL," +
                    "validade DATE NULL," +
                    "quantidade_atual INT NOT NULL DEFAULT 0," +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
            safeExec(jdbc, "CREATE UNIQUE INDEX uk_produto_lote_empresa_produto_codigo ON produto_lotes (empresa_id, produto_id, codigo_lote)");
            safeExec(jdbc, "CREATE INDEX idx_produto_lote_fefo ON produto_lotes (empresa_id, produto_id, validade, id)");

            safeExec(jdbc, "CREATE TABLE pmc_referencias (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                    "empresa_id BIGINT NOT NULL," +
                    "produto_id BIGINT NULL," +
                    "registro_ms VARCHAR(30) NULL," +
                    "gtin_ean VARCHAR(30) NULL," +
                    "descricao VARCHAR(255) NULL," +
                    "pmc DECIMAL(10,2) NOT NULL," +
                    "vigencia_inicio DATE NOT NULL," +
                    "vigencia_fim DATE NULL," +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
            safeExec(jdbc, "CREATE INDEX idx_pmc_lookup ON pmc_referencias (empresa_id, registro_ms, gtin_ean, vigencia_inicio, vigencia_fim)");

            safeExec(jdbc, "CREATE TABLE farmacia_auditoria_eventos (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                    "empresa_id BIGINT NOT NULL," +
                    "usuario_id BIGINT NULL," +
                    "tipo_evento VARCHAR(80) NOT NULL," +
                    "entidade VARCHAR(80) NULL," +
                    "entidade_id BIGINT NULL," +
                    "detalhes TEXT NULL," +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
            safeExec(jdbc, "CREATE INDEX idx_farm_auditoria_empresa_data ON farmacia_auditoria_eventos (empresa_id, created_at)");

            safeExec(jdbc, "ALTER TABLE venda_itens ADD COLUMN lote_codigo VARCHAR(60) NULL");
            safeExec(jdbc, "ALTER TABLE venda_itens ADD COLUMN lote_validade DATE NULL");
            safeExec(jdbc, "ALTER TABLE venda_itens ADD COLUMN receita_tipo VARCHAR(30) NULL");
            safeExec(jdbc, "ALTER TABLE venda_itens ADD COLUMN receita_numero VARCHAR(60) NULL");
            safeExec(jdbc, "ALTER TABLE venda_itens ADD COLUMN receita_prescritor VARCHAR(120) NULL");
            safeExec(jdbc, "ALTER TABLE venda_itens ADD COLUMN receita_data DATE NULL");
            safeExec(jdbc, "ALTER TABLE venda_itens ADD COLUMN pmc_aplicado DECIMAL(10,2) NULL");
            safeExec(jdbc, "ALTER TABLE venda_itens ADD COLUMN pmc_status VARCHAR(20) NULL");
        };
    }
}

