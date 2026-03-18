package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.EmpresaBrandingDTO;
import com.sistema.cadastro.dto.ParametroEmpresaDTO;
import com.sistema.cadastro.service.ParametroEmpresaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * Endpoints públicos para o PDV e telas sem autenticação (apenas identidade visual).
 */
@RestController
@RequestMapping("/api/parametros-cliente")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ParametroClienteController {

    private final ParametroEmpresaService parametroEmpresaService;

    @GetMapping("/branding/{empresaId}")
    public ResponseEntity<EmpresaBrandingDTO> brandingPorEmpresa(@PathVariable Long empresaId) {
        Optional<ParametroEmpresaDTO> opt = parametroEmpresaService.buscarPorEmpresaIdComInativos(empresaId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ParametroEmpresaDTO p = opt.get();
        EmpresaBrandingDTO b = EmpresaBrandingDTO.builder()
                .empresaId(p.getEmpresaId())
                .nomeEmpresa(p.getNomeEmpresa())
                .logoUrl(p.getLogoUrl())
                .corPrimaria(p.getCorPrimaria())
                .corSecundaria(p.getCorSecundaria())
                .corFundo(p.getCorFundo())
                .corTexto(p.getCorTexto())
                .corBotao(p.getCorBotao())
                .corBotaoTexto(p.getCorBotaoTexto())
                .build();
        return ResponseEntity.ok(b);
    }
}
