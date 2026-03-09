package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.VendaRequest;
import com.sistema.cadastro.dto.VendaResponse;
import com.sistema.cadastro.service.VendaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    @PreAuthorize("hasAnyRole('ADM', 'VENDEDOR')")
    public ResponseEntity<VendaResponse> create(@Valid @RequestBody VendaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(vendaService.criarVenda(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADM', 'VENDEDOR')")
    public ResponseEntity<List<VendaResponse>> findAll() {
        return ResponseEntity.ok(vendaService.listarTodas());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'VENDEDOR')")
    public ResponseEntity<VendaResponse> findById(@PathVariable Long id) {
        return vendaService.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/periodo")
    @PreAuthorize("hasAnyRole('ADM', 'VENDEDOR')")
    public ResponseEntity<List<VendaResponse>> findByPeriodo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);
        
        return ResponseEntity.ok(vendaService.buscarPorPeriodo(startDateTime, endDateTime));
    }

    @GetMapping("/hoje")
    @PreAuthorize("hasAnyRole('ADM', 'VENDEDOR')")
    public ResponseEntity<List<VendaResponse>> findToday() {
        LocalDate today = LocalDate.now();
        LocalDateTime startDateTime = today.atStartOfDay();
        LocalDateTime endDateTime = today.atTime(LocalTime.MAX);
        
        return ResponseEntity.ok(vendaService.buscarPorPeriodo(startDateTime, endDateTime));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        vendaService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}

