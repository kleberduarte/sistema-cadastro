package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.PdvTerminalCreateRequest;
import com.sistema.cadastro.dto.PdvTerminalResponse;
import com.sistema.cadastro.dto.PdvTerminalUpdateRequest;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.PdvTerminalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/pdv-terminais")
@RequiredArgsConstructor
public class PdvTerminalAdminController {

    private final PdvTerminalService pdvTerminalService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<List<PdvTerminalResponse>> listar(
            @RequestParam Long empresaId, Authentication auth) {
        Usuario u = auth != null && auth.getPrincipal() instanceof Usuario us ? us : null;
        if (u == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(pdvTerminalService.listarParaAdmin(u, empresaId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<PdvTerminalResponse> criar(
            @RequestBody PdvTerminalCreateRequest request, Authentication auth) {
        Usuario u = auth != null && auth.getPrincipal() instanceof Usuario us ? us : null;
        if (u == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(pdvTerminalService.criarParaAdmin(request, u));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<PdvTerminalResponse> atualizar(
            @PathVariable Long id,
            @RequestParam Long empresaId,
            @RequestBody PdvTerminalUpdateRequest request,
            Authentication auth) {
        Usuario u = auth != null && auth.getPrincipal() instanceof Usuario us ? us : null;
        if (u == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(pdvTerminalService.atualizarTerminalParaAdmin(id, empresaId, request, u));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<Void> excluir(@PathVariable Long id, Authentication auth) {
        Usuario u = auth != null && auth.getPrincipal() instanceof Usuario us ? us : null;
        if (u == null) {
            return ResponseEntity.status(401).build();
        }
        pdvTerminalService.excluirParaAdmin(id, u);
        return ResponseEntity.noContent().build();
    }
}
