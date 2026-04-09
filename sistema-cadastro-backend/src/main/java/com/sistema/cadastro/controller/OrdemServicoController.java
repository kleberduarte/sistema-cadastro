package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.OrdemServicoFechamentoRequest;
import com.sistema.cadastro.dto.OrdemServicoRequest;
import com.sistema.cadastro.dto.OrdemServicoResponse;
import com.sistema.cadastro.dto.OrdemServicoStatusRequest;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.OrdemServicoService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/ordens-servico")
@RequiredArgsConstructor
public class OrdemServicoController {

    private final OrdemServicoService ordemServicoService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<OrdemServicoResponse> create(
            @RequestBody OrdemServicoRequest request,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.status(HttpStatus.CREATED).body(ordemServicoService.criar(request, u, empresaId));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrdemServicoResponse>> findAll(
            @RequestParam(required = false) Long empresaId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        LocalDateTime inicio = dataInicio != null ? dataInicio.atStartOfDay() : null;
        LocalDateTime fim = dataFim != null ? dataFim.atTime(LocalTime.MAX) : null;
        return ResponseEntity.ok(ordemServicoService.listar(u, empresaId, status, inicio, fim));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrdemServicoResponse> findById(
            @PathVariable Long id,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ordemServicoService.buscarPorId(id, u, empresaId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<OrdemServicoResponse> update(
            @PathVariable Long id,
            @RequestBody OrdemServicoRequest request,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(ordemServicoService.atualizar(id, request, u, empresaId));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<OrdemServicoResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody OrdemServicoStatusRequest request,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(ordemServicoService.alterarStatus(id, request != null ? request.getStatus() : null, u, empresaId));
    }

    @PostMapping("/{id}/fechar")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<OrdemServicoResponse> fechar(
            @PathVariable Long id,
            @RequestBody(required = false) OrdemServicoFechamentoRequest request,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(ordemServicoService.fechar(id, request, u, empresaId));
    }

    @GetMapping("/{id}/impressao")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrdemServicoResponse> impressao(
            @PathVariable Long id,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ordemServicoService.buscarPorId(id, u, empresaId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        ordemServicoService.deletar(id, u, empresaId);
        return ResponseEntity.noContent().build();
    }
}
