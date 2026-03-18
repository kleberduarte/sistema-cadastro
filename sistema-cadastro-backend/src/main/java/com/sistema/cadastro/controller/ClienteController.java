package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.ClienteRequest;
import com.sistema.cadastro.dto.ClienteResponse;
import com.sistema.cadastro.dto.CodigoConviteResponse;
import com.sistema.cadastro.service.ClienteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
public class ClienteController {

    private static final Logger log = LoggerFactory.getLogger(ClienteController.class);

    private final ClienteService clienteService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADM', 'VENDEDOR')")
    public ResponseEntity<ClienteResponse> create(@Valid @RequestBody ClienteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clienteService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADM', 'VENDEDOR')")
    public ResponseEntity<List<ClienteResponse>> findAll() {
        return ResponseEntity.ok(clienteService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'VENDEDOR')")
    public ResponseEntity<ClienteResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADM', 'VENDEDOR')")
    public ResponseEntity<ClienteResponse> update(@PathVariable Long id, @Valid @RequestBody ClienteRequest request) {
        return ResponseEntity.ok(clienteService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        clienteService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADM', 'VENDEDOR')")
    public ResponseEntity<List<ClienteResponse>> search(@RequestParam String q) {
        return ResponseEntity.ok(clienteService.search(q));
    }

    @PostMapping("/{id}/codigo-convite-pdv")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<?> regenerarCodigoConvitePdv(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(clienteService.regenerarCodigoConvitePdv(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("POST /api/clientes/{}/codigo-convite-pdv falhou", id, e);
            String detail = e.getMessage();
            if (detail == null || detail.isBlank()) {
                detail = e.getClass().getSimpleName();
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            "Não foi possível gerar o código. Se o banco foi criado antes da criptografia, execute o script sql/migracao_convite_pdv_colunas.sql. Detalhe: "
                                    + detail));
        }
    }

    /**
     * Sempre 200: {@code codigo} preenchido se existir; {@code null} se ainda não foi gerado (evita 404 no navegador).
     */
    @GetMapping("/{id}/codigo-convite-pdv")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<CodigoConviteResponse> obterCodigoConvitePdv(@PathVariable Long id) {
        if (id == null || id < 1) {
            return ResponseEntity.badRequest().build();
        }
        CodigoConviteResponse r = clienteService.obterCodigoConvitePdv(id);
        if (r == null) {
            return ResponseEntity.ok(new CodigoConviteResponse(id, clienteService.nomeExibicaoEmpresaConvite(id), null));
        }
        return ResponseEntity.ok(r);
    }
}

