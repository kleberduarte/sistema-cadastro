package com.sistema.cadastro.controller;

import com.sistema.cadastro.model.FarmaciaAuditoriaEvento;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.repository.FarmaciaAuditoriaEventoRepository;
import com.sistema.cadastro.service.EmpresaScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/farmacia/auditoria")
@RequiredArgsConstructor
public class FarmaciaAuditoriaController {
    private final FarmaciaAuditoriaEventoRepository repository;
    private final EmpresaScopeService empresaScopeService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<List<FarmaciaAuditoriaEvento>> listar(@RequestParam(required = false) Long empresaId,
                                                                Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        Long eid = empresaScopeService.resolveForWrite(u, empresaId);
        return ResponseEntity.ok(repository.findTop100ByEmpresaIdOrderByCreatedAtDesc(eid));
    }
}

