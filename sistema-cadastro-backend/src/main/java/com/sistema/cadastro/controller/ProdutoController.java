package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.ProdutoRequest;
import com.sistema.cadastro.dto.ProdutoImportConfirmResponseDTO;
import com.sistema.cadastro.dto.ProdutoImportPreviewResponseDTO;
import com.sistema.cadastro.dto.ProdutoResponse;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.EmpresaScopeService;
import com.sistema.cadastro.service.ProdutoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
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

    @GetMapping("/paginado")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<Page<ProdutoResponse>> findPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        int safeSize = Math.max(1, Math.min(size, 100));
        int safePage = Math.max(0, page);
        PageRequest pageable = PageRequest.of(safePage, safeSize, Sort.by("id").descending());
        return ResponseEntity.ok(produtoService.findPage(u, empresaId, q, pageable));
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

    @DeleteMapping
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<Map<String, Object>> deleteAllByEmpresa(
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        long removed = produtoService.deleteAllByEmpresa(u, empresaId);
        return ResponseEntity.ok(Map.of(
                "removed", removed,
                "message", "Produtos removidos com sucesso."
        ));
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

    @GetMapping("/categorias")
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA', 'VENDEDOR')")
    public ResponseEntity<List<String>> listCategorias(
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(produtoService.listCategorias(u, empresaId));
    }

    @PostMapping(value = "/importacao/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<ProdutoImportPreviewResponseDTO> previewImportacao(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(produtoService.previewImportCsv(file, u, empresaId));
    }

    @PostMapping(value = "/importacao/confirmar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADM', 'ADMIN_EMPRESA')")
    public ResponseEntity<ProdutoImportConfirmResponseDTO> confirmarImportacao(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) Long empresaId,
            Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(produtoService.confirmImportCsv(file, u, empresaId));
    }
}
