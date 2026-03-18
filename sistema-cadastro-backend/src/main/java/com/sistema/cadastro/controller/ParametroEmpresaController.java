package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.ParametroEmpresaDTO;
import com.sistema.cadastro.service.ParametroEmpresaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/parametros-empresa")
@CrossOrigin(origins = "*")
public class ParametroEmpresaController {

    @Autowired
    private ParametroEmpresaService service;

    @PostMapping
    public ResponseEntity<ParametroEmpresaDTO> salvar(@RequestBody ParametroEmpresaDTO dto) {
        return ResponseEntity.ok(service.salvar(dto));
    }

    @GetMapping("/empresa/{empresaId}")
    public ResponseEntity<ParametroEmpresaDTO> buscarPorEmpresaId(@PathVariable Long empresaId) {
        Optional<ParametroEmpresaDTO> parametro = service.buscarPorEmpresaIdComInativos(empresaId);
        return parametro.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Cria parâmetros padrão no banco para o ID, se ainda não existir (admin). */
    @PostMapping("/garantir/{empresaId}")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<ParametroEmpresaDTO> garantirParametros(@PathVariable Long empresaId) {
        return ResponseEntity.ok(service.garantirParametrosMinimos(empresaId));
    }

    @GetMapping("/ativos")
    public ResponseEntity<ParametroEmpresaDTO> getParametrosAtivos() {
        return ResponseEntity.ok(service.getParametrosAtivos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ParametroEmpresaDTO> buscarPorId(@PathVariable Long id) {
        Optional<ParametroEmpresaDTO> parametro = service.buscarPorId(id);
        return parametro.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }

    /** Remove o cadastro de parâmetros desta empresa (não apaga PDVs no banco). */
    @DeleteMapping("/empresa/{empresaId}/cadastro")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<Void> excluirCadastroPorEmpresaId(@PathVariable Long empresaId) {
        if (!service.excluirPorEmpresaId(empresaId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<ParametroEmpresaDTO>> listarTodos() {
        return ResponseEntity.ok(service.listarTodos());
    }
}

