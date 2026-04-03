package com.sistema.cadastro.controller;

import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.PmcService;
import com.sistema.cadastro.service.EmpresaScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/farmacia/pmc")
@RequiredArgsConstructor
public class PmcController {
    private final PmcService pmcService;
    private final EmpresaScopeService empresaScopeService;

    @PostMapping(value = "/importacao", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<Map<String, Object>> importar(@RequestPart("file") MultipartFile file,
                                                        @RequestParam(required = false) Long empresaId,
                                                        Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(pmcService.importCsv(file, u, empresaId));
    }

    @GetMapping("/relatorio")
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<Map<String, Object>> relatorio(@RequestParam(required = false) Long empresaId,
                                                          Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        return ResponseEntity.ok(pmcService.relatorioConformidade(u, empresaId));
    }

    @PostMapping("/sync")
    @PreAuthorize("hasAnyRole('ADM','ADMIN_EMPRESA')")
    public ResponseEntity<Map<String, Object>> sync(@RequestParam(required = false) Long empresaId,
                                                    Authentication auth) {
        Usuario u = SecurityControllerSupport.requireUsuario(auth);
        Long eid = empresaScopeService.resolveForWrite(u, empresaId);
        return ResponseEntity.ok(pmcService.syncManualFromConfiguredSourceForEmpresa(eid, u.getId()));
    }
}

