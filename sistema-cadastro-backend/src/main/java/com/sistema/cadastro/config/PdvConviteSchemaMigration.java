package com.sistema.cadastro.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Hibernate {@code ddl-auto=update} no MySQL costuma não alargar colunas já existentes.
 * O código de convite criptografado exige {@code VARCHAR} grande; ajusta na subida da API.
 */
@Configuration
public class PdvConviteSchemaMigration {

    private static final Logger log = LoggerFactory.getLogger(PdvConviteSchemaMigration.class);

    @Bean
    @Order(0)
    ApplicationRunner alargarColunasConvitePdv(JdbcTemplate jdbc) {
        return args -> {
            try {
                jdbc.execute(
                        "ALTER TABLE pdv_convite_por_empresa MODIFY COLUMN codigo VARCHAR(512) NOT NULL");
                log.info("Schema: pdv_convite_por_empresa.codigo garantido como VARCHAR(512).");
            } catch (Exception e) {
                log.warn(
                        "Não foi possível alterar pdv_convite_por_empresa.codigo (tabela nova ou permissão): {}",
                        e.getMessage());
            }
            try {
                jdbc.execute("ALTER TABLE clientes MODIFY COLUMN codigo_convite_pdv VARCHAR(512) NULL");
                log.info("Schema: clientes.codigo_convite_pdv garantido como VARCHAR(512).");
            } catch (Exception e) {
                log.warn(
                        "Não foi possível alterar clientes.codigo_convite_pdv: {}",
                        e.getMessage());
            }
        };
    }
}
