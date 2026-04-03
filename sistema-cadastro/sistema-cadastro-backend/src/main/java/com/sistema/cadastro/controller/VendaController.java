package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.VendaRequest;
import com.sistema.cadastro.dto.VendaResponse;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.VendaService;
import jakarta.validation.Valid;
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
@RequestMapping("/api/vendas")
@RequiredArgsConstructor
public class VendaController {

    private final VendaService vendaService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<VendaResponse> create(
            @Valid @RequestBody VendaRequest request,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.status(HttpStatus.CREATED).body(vendaService.criarVenda(request, u, empresaId));
    }

    @GetMapping
    /** Qualquer usuário logado pode consultar vendas (relatórios / PDV). */
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<VendaResponse>> findAll(
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(vendaService.listarTodas(u, empresaId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<VendaResponse> findById(
            @PathVariable Long id,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return vendaService.buscarPorId(id, u, empresaId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/periodo")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<VendaResponse>> findByPeriodo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);

        return ResponseEntity.ok(vendaService.buscarPorPeriodo(startDateTime, endDateTime, u, empresaId));
    }

    @GetMapping("/hoje")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<VendaResponse>> findToday(
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        LocalDate today = LocalDate.now();
        LocalDateTime startDateTime = today.atStartOfDay();
        LocalDateTime endDateTime = today.atTime(LocalTime.MAX);

        return ResponseEntity.ok(vendaService.buscarPorPeriodo(startDateTime, endDateTime, u, empresaId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        vendaService.deletar(id, u, empresaId);
        return ResponseEntity.noContent().build();
    }
}

