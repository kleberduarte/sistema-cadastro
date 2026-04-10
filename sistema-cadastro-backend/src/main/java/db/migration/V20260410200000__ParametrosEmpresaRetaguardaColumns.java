package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Objects;

/**
 * Garante colunas de {@code parametros_empresa} exigidas pelo Hibernate (validate).
 * Migração SQL com PREPARE/EXECUTE pode não aplicar bem em alguns drivers/Flyway; JDBC é determinístico.
 */
public class V20260410200000__ParametrosEmpresaRetaguardaColumns extends BaseJavaMigration {

    private static final String TABLE = "parametros_empresa";

    private static final String[][] COLUMNS = {
            {"suporte_email", "VARCHAR(255) NULL"},
            {"suporte_whatsapp", "VARCHAR(32) NULL"},
            {"segmento", "VARCHAR(40) NULL"},
            {"modulo_farmacia_ativo", "BIT NULL"},
            {"farmacia_lote_validade_obrigatorio", "BIT NULL"},
            {"farmacia_controlados_ativo", "BIT NULL"},
            {"farmacia_antimicrobianos_ativo", "BIT NULL"},
            {"farmacia_pmc_ativo", "BIT NULL"},
            {"farmacia_pmc_modo", "VARCHAR(20) NULL"},
            {"modulo_informatica_ativo", "BIT NULL"},
            {"endereco_linha1_os", "VARCHAR(500) NULL"},
            {"cidade_uf_os", "VARCHAR(200) NULL"},
            {"cnpj", "VARCHAR(24) NULL"},
            {"inscricao_municipal", "VARCHAR(40) NULL"},
            {"telefone_comercial", "VARCHAR(40) NULL"},
            {"fax", "VARCHAR(40) NULL"},
            {"email_comercial", "VARCHAR(255) NULL"},
            {"texto_termos_os", "TEXT NULL"},
            {"ativo", "BIT NULL"},
    };

    @Override
    public void migrate(Context context) throws Exception {
        Connection conn = context.getConnection();
        for (String[] col : COLUMNS) {
            String name = col[0];
            String ddl = col[1];
            Objects.requireNonNull(name);
            Objects.requireNonNull(ddl);
            if (!columnExists(conn, TABLE, name)) {
                String sql = "ALTER TABLE " + TABLE + " ADD COLUMN " + name + " " + ddl;
                try (Statement st = conn.createStatement()) {
                    st.execute(sql);
                }
            }
        }

        try (Statement st = conn.createStatement()) {
            st.executeUpdate("UPDATE parametros_empresa SET modulo_farmacia_ativo = 0 WHERE modulo_farmacia_ativo IS NULL");
            st.executeUpdate("UPDATE parametros_empresa SET farmacia_lote_validade_obrigatorio = 0 WHERE farmacia_lote_validade_obrigatorio IS NULL");
            st.executeUpdate("UPDATE parametros_empresa SET farmacia_controlados_ativo = 0 WHERE farmacia_controlados_ativo IS NULL");
            st.executeUpdate("UPDATE parametros_empresa SET farmacia_antimicrobianos_ativo = 0 WHERE farmacia_antimicrobianos_ativo IS NULL");
            st.executeUpdate("UPDATE parametros_empresa SET farmacia_pmc_ativo = 0 WHERE farmacia_pmc_ativo IS NULL");
            st.executeUpdate("UPDATE parametros_empresa SET farmacia_pmc_modo = 'ALERTA' WHERE farmacia_pmc_modo IS NULL OR TRIM(farmacia_pmc_modo) = ''");
            st.executeUpdate("UPDATE parametros_empresa SET modulo_informatica_ativo = 0 WHERE modulo_informatica_ativo IS NULL");
            st.executeUpdate("UPDATE parametros_empresa SET ativo = 1 WHERE ativo IS NULL");
        }
    }

    private static boolean columnExists(Connection conn, String table, String column) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?")) {
            ps.setString(1, table);
            ps.setString(2, column);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }
}
