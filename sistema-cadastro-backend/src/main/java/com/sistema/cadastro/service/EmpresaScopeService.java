package com.sistema.cadastro.service;

import com.sistema.cadastro.model.Role;
import com.sistema.cadastro.model.Usuario;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

/**
 * Resolve o {@code empresaId} efetivo para leitura/escrita conforme perfil (multi-tenant).
 */
@Service
public class EmpresaScopeService {

    @Value("${app.pdv.empresa-padrao-id:1}")
    private long empresaPadraoId;

    public long empresaPadrao() {
        return empresaPadraoId;
    }

    /** Gravação: sempre uma empresa concreta. ADM pode informar {@code empresaIdParam}; demais usam a própria. */
    public long resolveForWrite(Usuario u, Long empresaIdParam) {
        if (u == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        Role r = u.getRole();
        if (r == Role.ADM) {
            if (empresaIdParam != null && empresaIdParam >= 1) {
                return empresaIdParam;
            }
            return empresaPadraoId;
        }
        long mine = (u.getEmpresaId() != null && u.getEmpresaId() >= 1) ? u.getEmpresaId() : empresaPadraoId;
        if (empresaIdParam != null && empresaIdParam >= 1 && !empresaIdParam.equals(mine)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem permissão para esta empresa.");
        }
        return mine;
    }

    /**
     * Listagem: {@link Optional#empty()} = ADM sem filtro (todas as empresas).
     * Caso contrário, filtrar por {@link Optional#get()}.
     */
    public Optional<Long> resolveForList(Usuario u, Long empresaIdParam) {
        if (u == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        if (u.getRole() == Role.ADM) {
            if (empresaIdParam != null && empresaIdParam >= 1) {
                return Optional.of(empresaIdParam);
            }
            return Optional.empty();
        }
        return Optional.of(resolveForWrite(u, empresaIdParam));
    }

    public void assertEmpresaAllowed(Usuario u, Long entityEmpresaId) {
        if (entityEmpresaId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Registro sem empresa.");
        }
        if (u.getRole() == Role.ADM) {
            return;
        }
        long mine = resolveForWrite(u, null);
        if (!entityEmpresaId.equals(mine)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem permissão para este registro.");
        }
    }
}
