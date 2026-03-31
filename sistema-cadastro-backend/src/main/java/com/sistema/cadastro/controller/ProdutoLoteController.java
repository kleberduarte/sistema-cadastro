package com.sistema.cadastro.controller;

import com.sistema.cadastro.model.ProdutoLote;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.ProdutoLoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/farmacia/lotes")
@RequiredArgsConstructor
public class ProdutoLoteController {
    private final ProdutoLoteService produtoLoteService;

    @GetMapping("/{produtoId}")
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA','VENDEDOR')")
    public ResponseEntity<List<ProdutoLote>> listar(@PathVariable Long produtoId,
                                                    @RequestParam(required = false) Long empresaId,
                                                    Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(produtoLoteService.listar(u, empresaId, produtoId));
    }

    @PostMapping("/{produtoId}/entrada")
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<ProdutoLote> entrada(@PathVariable Long produtoId,
                                               @RequestParam(required = false) Long empresaId,
                                               @RequestParam String codigoLote,
                                               @RequestParam(required = false) String validade,
                                               @RequestParam Integer quantidade,
                                               Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        LocalDate v = (validade == null || validade.isBlank()) ? null : LocalDate.parse(validade);
        return ResponseEntity.ok(produtoLoteService.entrada(u, empresaId, produtoId, codigoLote, v, quantidade));
    }
}

