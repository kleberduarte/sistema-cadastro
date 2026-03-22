package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.EmpresaBrandingDTO;
import com.sistema.cadastro.dto.ParametroEmpresaDTO;
import com.sistema.cadastro.service.ParametroEmpresaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        if (empresaId == null || empresaId < 1) {
            return ResponseEntity.badRequest().build();
        }
        ParametroEmpresaDTO p = parametroEmpresaService.buscarPorEmpresaIdComInativos(empresaId)
                .orElseGet(() -> {
                    ParametroEmpresaDTO d = parametroEmpresaService.getParametrosDefault();
                    d.setEmpresaId(empresaId);
                    return d;
                });
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
                .mensagemBoasVindas(p.getMensagemBoasVindas())
                .build();
        return ResponseEntity.ok(b);
    }
}
