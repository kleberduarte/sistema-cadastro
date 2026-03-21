package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.ClienteRequest;
import com.sistema.cadastro.dto.ClienteResponse;
import com.sistema.cadastro.dto.CodigoConviteResponse;
import com.sistema.cadastro.model.Role;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.ClienteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
public class ClienteController {

    private static final Logger log = LoggerFactory.getLogger(ClienteController.class);

    private final ClienteService clienteService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<ClienteResponse> create(
            @Valid @RequestBody ClienteRequest request,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.status(HttpStatus.CREATED).body(clienteService.create(request, u, empresaId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<List<ClienteResponse>> findAll(
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(clienteService.findAll(u, empresaId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<ClienteResponse> findById(
            @PathVariable Long id,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(clienteService.findById(id, u, empresaId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<ClienteResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ClienteRequest request,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(clienteService.update(id, request, u, empresaId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        clienteService.delete(id, u, empresaId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<List<ClienteResponse>> search(
            @RequestParam String q,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(clienteService.search(q, u, empresaId));
    }

    @PostMapping("/{id}/codigo-convite-pdv")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<?> regenerarCodigoConvitePdv(@PathVariable Long id, Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        assertConviteEmpresa(u, id);
        try {
            return ResponseEntity.ok(clienteService.regenerarCodigoConvitePdv(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("POST /api/clientes/{}/codigo-convite-pdv falhou", id, e);
            String detail = e.getMessage();
            if (detail == null || detail.isBlank()) {
                detail = e.getClass().getSimpleName();
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            "Não foi possível gerar o código. Se o banco foi criado antes da criptografia, execute o script sql/migracao_convite_pdv_colunas.sql. Detalhe: "
                                    + detail));
        }
    }

    @GetMapping("/{id}/codigo-convite-pdv")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<CodigoConviteResponse> obterCodigoConvitePdv(@PathVariable Long id, Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        if (id == null || id < 1) {
            return ResponseEntity.badRequest().build();
        }
        assertConviteEmpresa(u, id);
        CodigoConviteResponse r = clienteService.obterCodigoConvitePdv(id);
        if (r == null) {
            return ResponseEntity.ok(new CodigoConviteResponse(id, clienteService.nomeExibicaoEmpresaConvite(id), null));
        }
        return ResponseEntity.ok(r);
    }

    private static void assertConviteEmpresa(Usuario u, Long empresaConviteId) {
        if (u.getRole() == Role.ADM) {
            return;
        }
        if (u.getEmpresaId() == null || !u.getEmpresaId().equals(empresaConviteId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem permissão para convite desta empresa.");
        }
    }
}
