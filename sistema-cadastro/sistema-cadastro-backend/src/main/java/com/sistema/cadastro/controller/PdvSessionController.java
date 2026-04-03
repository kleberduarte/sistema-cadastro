package com.sistema.cadastro.controller;

import com.sistema.cadastro.dto.PdvEntrarInteligenteRequest;
import com.sistema.cadastro.dto.PdvHeartbeatRequest;
import com.sistema.cadastro.dto.PdvTerminalResponse;
import com.sistema.cadastro.dto.PdvVincularRequest;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.service.PdvTerminalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/pdv")
@RequiredArgsConstructor
public class PdvSessionController {

    private final PdvTerminalService pdvTerminalService;

    @PostMapping("/vincular")
    public ResponseEntity<PdvTerminalResponse> vincular(
            @RequestBody PdvVincularRequest request,
            Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof Usuario u)) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(pdvTerminalService.vincular(request, u));
    }

    /** Login PDV: vincula ao caixa ou cria o terminal se ainda não existir (usuário já autenticado). */
    @PostMapping("/vincular-ou-registrar")
    public ResponseEntity<PdvTerminalResponse> vincularOuRegistrar(
            @RequestBody PdvVincularRequest request,
            Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof Usuario)) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(pdvTerminalService.vincularOuRegistrar(request, authentication));
    }

    @GetMapping("/terminal-cadastrado")
    public ResponseEntity<Map<String, Boolean>> terminalCadastrado(
            @RequestParam Long empresaId,
            @RequestParam String codigo) {
        return ResponseEntity.ok(Map.of(
                "cadastrado", pdvTerminalService.existeTerminalNaEmpresa(empresaId, codigo)));
    }

    /**
     * Login PDV: só usuário/senha antes; aqui vincula empresa do cadastro do usuário (ou padrão) e caixa auto.
     */
    @PostMapping("/entrar-inteligente")
    public ResponseEntity<PdvTerminalResponse> entrarInteligente(
            @RequestBody(required = false) PdvEntrarInteligenteRequest request,
            Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof Usuario u)) {
            return ResponseEntity.status(401).build();
        }
        Long emp = request != null ? request.getEmpresaId() : null;
        return ResponseEntity.ok(pdvTerminalService.entrarInteligente(u, emp));
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<Void> heartbeat(@RequestBody PdvHeartbeatRequest request, Authentication authentication) {
        pdvTerminalService.heartbeat(request, authentication);
        return ResponseEntity.noContent().build();
    }

    /** Admin no PDV: encerra sessão neste caixa (retaguarda). */
    @PostMapping("/sair")
    @PreAuthorize("hasRole('ADM')")
    public ResponseEntity<Void> sair(@RequestBody PdvHeartbeatRequest request) {
        pdvTerminalService.encerrarSessaoOperador(request.getTerminalId());
        return ResponseEntity.noContent().build();
    }
}
