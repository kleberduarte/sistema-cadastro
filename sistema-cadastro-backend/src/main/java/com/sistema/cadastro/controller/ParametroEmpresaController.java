package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.ParametroEmpresaDTO;
import com.sistema.cadastro.model.Role;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.ParametroEmpresaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/parametros-empresa")
@CrossOrigin(origins = "*")
public class ParametroEmpresaController {

    @Autowired
    private ParametroEmpresaService service;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<ParametroEmpresaDTO> salvar(@RequestBody ParametroEmpresaDTO dto, Authentication auth) {
        Usuario requester = auth != null && auth.getPrincipal() instanceof Usuario u ? u : null;
        if (requester != null && requester.getRole() == Role.ADMIN_EMPRESA) {
            if (requester.getEmpresaId() == null || requester.getEmpresaId() < 1) {
                return ResponseEntity.status(403).build();
            }
            dto.setEmpresaId(requester.getEmpresaId());
        }
        boolean permitirAlterarAtivo = requester != null && requester.getRole() == Role.ADM;
        return ResponseEntity.ok(service.salvar(dto, permitirAlterarAtivo));
    }

    @GetMapping("/empresa/{empresaId}")
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA','VENDEDOR')")
    public ResponseEntity<ParametroEmpresaDTO> buscarPorEmpresaId(@PathVariable Long empresaId, Authentication auth) {
        Usuario requester = auth != null && auth.getPrincipal() instanceof Usuario u ? u : null;
        if (requester != null && requester.getRole() == Role.ADMIN_EMPRESA
                && (requester.getEmpresaId() == null || !requester.getEmpresaId().equals(empresaId))) {
            return ResponseEntity.status(403).build();
        }
        if (requester != null && requester.getRole() == Role.VENDEDOR
                && (requester.getEmpresaId() == null || !requester.getEmpresaId().equals(empresaId))) {
            return ResponseEntity.status(403).build();
        }
        Optional<ParametroEmpresaDTO> parametro = service.buscarPorEmpresaIdComInativos(empresaId);
        return parametro.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Cria parâmetros padrão no banco para o ID, se ainda não existir (admin). */
    @PostMapping("/garantir/{empresaId}")
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<ParametroEmpresaDTO> garantirParametros(@PathVariable Long empresaId, Authentication auth) {
        Usuario requester = auth != null && auth.getPrincipal() instanceof Usuario u ? u : null;
        if (requester != null && requester.getRole() == Role.ADMIN_EMPRESA
                && (requester.getEmpresaId() == null || !requester.getEmpresaId().equals(empresaId))) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(service.garantirParametrosMinimos(empresaId));
    }

    @GetMapping("/ativos")
    public ResponseEntity<ParametroEmpresaDTO> getParametrosAtivos() {
        return ResponseEntity.ok(service.getParametrosAtivos());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<ParametroEmpresaDTO> buscarPorId(@PathVariable Long id, Authentication auth) {
        Usuario requester = auth != null && auth.getPrincipal() instanceof Usuario u ? u : null;
        Optional<ParametroEmpresaDTO> parametro = service.buscarPorId(id);
        if (parametro.isPresent() && requester != null && requester.getRole() == Role.ADMIN_EMPRESA) {
            Long eid = parametro.get().getEmpresaId();
            if (requester.getEmpresaId() == null || !requester.getEmpresaId().equals(eid)) {
                return ResponseEntity.status(403).build();
            }
        }
        return parametro.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }

    /** Remove o cadastro da empresa e todos os dados vinculados (produtos, clientes, vendas, PDVs, usuários da empresa, etc.). */
    @DeleteMapping("/empresa/{empresaId}/cadastro")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<Void> excluirCadastroPorEmpresaId(@PathVariable Long empresaId) {
        if (empresaId != null && empresaId <= 1L) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não é permitido excluir a empresa padrão do sistema (ID 1).");
        }
        if (!service.excluirPorEmpresaId(empresaId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<List<ParametroEmpresaDTO>> listarTodos(Authentication auth) {
        Usuario requester = auth != null && auth.getPrincipal() instanceof Usuario u ? u : null;
        if (requester != null && requester.getRole() == Role.ADMIN_EMPRESA) {
            return ResponseEntity.ok(service.listarPorEmpresaId(requester.getEmpresaId()));
        }
        return ResponseEntity.ok(service.listarTodos());
    }
}

