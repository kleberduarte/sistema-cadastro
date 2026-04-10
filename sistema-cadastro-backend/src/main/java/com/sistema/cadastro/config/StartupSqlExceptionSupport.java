package com.sistema.cadastro.config;

import java.sql.SQLException;

/**
 * Migrações JDBC idempotentes: o Spring costuma embrulhar o SQLException do MySQL em
 * {@code DataAccessException} com texto genérico ("bad SQL grammar"); o erro real (ex.: coluna duplicada) fica em {@link Throwable#getCause()}.
 */
final class StartupSqlExceptionSupport {

    private StartupSqlExceptionSupport() {}

    /** True quando o erro indica objeto de schema já existente (idempotência). */
    static boolean isBenignDuplicateOrExists(Throwable e) {
        if (e == null) {
            return false;
        }
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof SQLException sql) {
                int code = sql.getErrorCode();
                // MySQL: 1050 table exists, 1060 duplicate column, 1061 duplicate key name
                if (code == 1050 || code == 1060 || code == 1061) {
                    return true;
                }
            }
            String m = t.getMessage();
            if (m == null) {
                continue;
            }
            String u = m.toUpperCase();
            if (u.contains("DUPLICATE COLUMN")
                    || u.contains("DUPLICATE KEY NAME")
                    || u.contains("DUPLICATE KEY")
                    || u.contains("ALREADY EXISTS")
                    || u.contains("TABLE") && u.contains("ALREADY EXISTS")) {
                return true;
            }
        }
        return false;
    }
}
