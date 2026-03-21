package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.FecharCaixaRequest;
import com.sistema.cadastro.dto.FechamentoCaixaResponse;
import com.sistema.cadastro.dto.FechamentoCaixaResumoResponse;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.FechamentoCaixaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pdv/fechamentos")
@RequiredArgsConstructor
public class FechamentoCaixaController {

    private final FechamentoCaixaService fechamentoCaixaService;

    @GetMapping("/resumo-hoje")
    @PreAuthorize("hasAnyRole('ADM', 'VENDEDOR')")
    public ResponseEntity<FechamentoCaixaResumoResponse> resumoHoje(Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof Usuario usuario)) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(fechamentoCaixaService.obterResumoHoje(usuario));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADM', 'VENDEDOR')")
    public ResponseEntity<FechamentoCaixaResponse> fecharCaixa(
            @Valid @RequestBody(required = false) FecharCaixaRequest request,
            Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof Usuario usuario)) {
            return ResponseEntity.status(401).build();
        }
        FecharCaixaRequest body = request != null ? request : new FecharCaixaRequest();
        return ResponseEntity.ok(fechamentoCaixaService.fecharCaixa(usuario, body));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<List<FechamentoCaixaResponse>> historico(@RequestParam Long empresaId, Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof Usuario usuario)) {
            return ResponseEntity.status(401).build();
        }
        if (usuario.getRole() == com.sistema.cadastro.model.Role.ADMIN_EMPRESA) {
            if (usuario.getEmpresaId() == null || !usuario.getEmpresaId().equals(empresaId)) {
                return ResponseEntity.status(403).build();
            }
        }
        return ResponseEntity.ok(fechamentoCaixaService.listarHistoricoEmpresa(empresaId));
    }
}

