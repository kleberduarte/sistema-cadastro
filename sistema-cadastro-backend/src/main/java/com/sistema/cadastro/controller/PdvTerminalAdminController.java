package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.PdvTerminalCreateRequest;
import com.sistema.cadastro.dto.PdvTerminalResponse;
import com.sistema.cadastro.dto.PdvTerminalUpdateRequest;
import com.sistema.cadastro.service.PdvTerminalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/pdv-terminais")
@RequiredArgsConstructor
public class PdvTerminalAdminController {

    private final PdvTerminalService pdvTerminalService;

    @GetMapping
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<List<PdvTerminalResponse>> listar(@RequestParam Long empresaId) {
        return ResponseEntity.ok(pdvTerminalService.listarPorEmpresa(empresaId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<PdvTerminalResponse> criar(@RequestBody PdvTerminalCreateRequest request) {
        return ResponseEntity.ok(pdvTerminalService.criar(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<PdvTerminalResponse> atualizar(
            @PathVariable Long id,
            @RequestParam Long empresaId,
            @RequestBody PdvTerminalUpdateRequest request) {
        return ResponseEntity.ok(pdvTerminalService.atualizarTerminal(id, empresaId, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        pdvTerminalService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
