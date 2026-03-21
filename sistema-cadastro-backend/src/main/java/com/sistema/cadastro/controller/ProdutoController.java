package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.ProdutoRequest;
import com.sistema.cadastro.dto.ProdutoResponse;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.EmpresaScopeService;
import com.sistema.cadastro.service.ProdutoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/produtos")
@RequiredArgsConstructor
public class ProdutoController {

    private final ProdutoService produtoService;
    private final EmpresaScopeService empresaScopeService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<ProdutoResponse> create(
            @Valid @RequestBody ProdutoRequest request,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        long eid = empresaScopeService.resolveForWrite(u, empresaId);
        return ResponseEntity.status(HttpStatus.CREATED).body(produtoService.create(request, eid));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<List<ProdutoResponse>> findAll(
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(produtoService.findAll(u, empresaId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<ProdutoResponse> findById(
            @PathVariable Long id,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(produtoService.findById(id, u, empresaId));
    }

    @GetMapping("/codigo/{codigo}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<ProdutoResponse> findByCodigoProduto(
            @PathVariable String codigo,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(produtoService.findByCodigoProduto(codigo, u, empresaId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<ProdutoResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ProdutoRequest request,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(produtoService.update(id, request, u, empresaId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        produtoService.delete(id, u, empresaId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<List<ProdutoResponse>> search(
            @RequestParam String q,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(produtoService.search(q, u, empresaId));
    }

    @GetMapping("/categoria/{categoria}")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<List<ProdutoResponse>> findByCategoria(
            @PathVariable String categoria,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(produtoService.findByCategoria(categoria, u, empresaId));
    }
}
