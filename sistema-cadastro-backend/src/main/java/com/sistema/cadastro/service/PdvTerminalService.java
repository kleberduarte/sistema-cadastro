package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.*;
import com.sistema.cadastro.model.PdvTerminal;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.repository.PdvTerminalRepository;
import com.sistema.cadastro.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PdvTerminalService {

    private static final long ONLINE_THRESHOLD_SECONDS = 90;

    private final PdvTerminalRepository pdvTerminalRepository;
    private final ParametroEmpresaService parametroEmpresaService;
    private final UsuarioRepository usuarioRepository;

    @Value("${app.pdv.empresa-padrao-id:1}")
    private long empresaPadraoPdvId;

    public List<PdvTerminalResponse> listarPorEmpresa(Long empresaId) {
        return pdvTerminalRepository.findByEmpresaIdOrderByCodigoAsc(empresaId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PdvTerminalResponse criar(PdvTerminalCreateRequest req) {
        if (req.getEmpresaId() == null || req.getCodigo() == null || req.getCodigo().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "empresaId e codigo são obrigatórios");
        }
        parametroEmpresaService.garantirParametrosMinimos(req.getEmpresaId());
        String codigo = req.getCodigo().trim();
        if (pdvTerminalRepository.findByEmpresaIdAndCodigoIgnoreCase(req.getEmpresaId(), codigo).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe PDV com este código nesta empresa");
        }
        PdvTerminal t = PdvTerminal.builder()
                .empresaId(req.getEmpresaId())
                .codigo(codigo)
                .nome(req.getNome() != null ? req.getNome().trim() : null)
                .ativo(true)
                .build();
        return toResponse(pdvTerminalRepository.save(t));
    }

    @Transactional
    public void excluir(Long id) {
        PdvTerminal t = pdvTerminalRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Terminal não encontrado"));
        usuarioRepository.findByPdvTerminalId(id).forEach(user -> {
            user.setPdvTerminalId(null);
            usuarioRepository.save(user);
        });
        pdvTerminalRepository.delete(t);
    }

    private static final String MSG_JA_VINCULADO = "Este usuário já está vinculado a outro PDV. "
            + "Desvincule em Usuários (retaguarda) ou exclua o PDV atual para cadastrar em outro caixa.";

    private Usuario reloadUsuario(Usuario authUser) {
        return usuarioRepository.findByUsername(authUser.getUsername()).orElse(authUser);
    }

    private void garantirPodeUsarTerminal(Usuario u, Long terminalId) {
        if (u.getPdvTerminalId() != null && !u.getPdvTerminalId().equals(terminalId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, MSG_JA_VINCULADO);
        }
    }

    /**
     * Vincula sessão do operador a um terminal (PDV físico).
     */
    @Transactional
    public PdvTerminalResponse vincular(PdvVincularRequest req, Usuario authUser) {
        if (req.getEmpresaId() == null || req.getCodigo() == null || req.getCodigo().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "empresaId e codigo são obrigatórios");
        }
        Usuario u = reloadUsuario(authUser);
        PdvTerminal t = pdvTerminalRepository
                .findByEmpresaIdAndCodigoIgnoreCase(req.getEmpresaId(), req.getCodigo().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PDV não encontrado para esta empresa"));
        if (!t.isAtivo()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "PDV desativado");
        }
        garantirPodeUsarTerminal(u, t.getId());
        if (u.getPdvTerminalId() == null) {
            u.setPdvTerminalId(t.getId());
            usuarioRepository.save(u);
        }
        return toResponse(t);
    }

    /**
     * Primeiro login no PDV: se o código não existir na empresa, cria o terminal automaticamente.
     */
    @Transactional
    public PdvTerminalResponse vincularOuRegistrar(PdvVincularRequest req, Authentication auth) {
        if (!(auth.getPrincipal() instanceof Usuario authUser)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Não autenticado");
        }
        Usuario u = reloadUsuario(authUser);
        if (req.getEmpresaId() == null || req.getCodigo() == null || req.getCodigo().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "empresaId e codigo são obrigatórios");
        }
        Long empresaId = req.getEmpresaId();
        String codigo = req.getCodigo().trim();
        if (codigo.length() > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Código do PDV deve ter no máximo 50 caracteres");
        }
        return pdvTerminalRepository.findByEmpresaIdAndCodigoIgnoreCase(empresaId, codigo)
                .map(t -> {
                    if (!t.isAtivo()) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "PDV desativado");
                    }
                    garantirPodeUsarTerminal(u, t.getId());
                    if (u.getPdvTerminalId() == null) {
                        u.setPdvTerminalId(t.getId());
                        usuarioRepository.save(u);
                    }
                    return toResponse(t);
                })
                .orElseGet(() -> {
                    if (u.getPdvTerminalId() != null) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, MSG_JA_VINCULADO);
                    }
                    parametroEmpresaService.garantirParametrosMinimos(empresaId);
                    String nome = req.getNome() != null ? req.getNome().trim() : "";
                    if (nome.isBlank()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Nome do caixa é obrigatório para registrar um novo PDV neste código");
                    }
                    if (nome.length() > 120) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome do caixa: máximo 120 caracteres");
                    }
                    PdvTerminal novo = PdvTerminal.builder()
                            .empresaId(empresaId)
                            .codigo(codigo)
                            .nome(nome)
                            .ativo(true)
                            .build();
                    novo = pdvTerminalRepository.save(novo);
                    u.setPdvTerminalId(novo.getId());
                    usuarioRepository.save(u);
                    return toResponse(novo);
                });
    }

    public boolean existeTerminalNaEmpresa(Long empresaId, String codigo) {
        if (empresaId == null || codigo == null || codigo.isBlank()) {
            return false;
        }
        return pdvTerminalRepository.findByEmpresaIdAndCodigoIgnoreCase(empresaId, codigo.trim()).isPresent();
    }

    private long resolverEmpresaIdPdvLogin(Usuario u, Long empresaInformadaNaTela) {
        if (empresaInformadaNaTela != null && empresaInformadaNaTela >= 1) {
            if (u.getEmpresaId() != null && u.getEmpresaId() >= 1
                    && !u.getEmpresaId().equals(empresaInformadaNaTela)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Seu usuário está cadastrado apenas para a empresa " + u.getEmpresaId()
                                + ". Use esse ID na tela ou peça ao admin para ajustar.");
            }
            return empresaInformadaNaTela;
        }
        if (u.getEmpresaId() != null && u.getEmpresaId() >= 1) {
            return u.getEmpresaId();
        }
        return empresaPadraoPdvId;
    }

    /**
     * Login PDV: empresa pelo ID informado na tela (prioridade), senão cadastro do usuário, senão padrão.
     */
    @Transactional
    public PdvTerminalResponse entrarInteligente(Usuario authUser, Long empresaInformadaNaTela) {
        Usuario u = usuarioRepository.findByUsername(authUser.getUsername()).orElse(authUser);
        long empresaId = resolverEmpresaIdPdvLogin(u, empresaInformadaNaTela);
        parametroEmpresaService.garantirParametrosMinimos(empresaId);

        if (u.getPdvTerminalId() != null) {
            Optional<PdvTerminal> bound = pdvTerminalRepository.findById(u.getPdvTerminalId());
            if (bound.isPresent()) {
                PdvTerminal t = bound.get();
                if (!t.getEmpresaId().equals(empresaId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "Você já está vinculado ao PDV " + t.getCodigo() + " da empresa "
                                    + t.getEmpresaId() + ". Informe o ID " + t.getEmpresaId()
                                    + " nesta tela ou desvincule em Usuários.");
                }
                if (t.isAtivo()) {
                    return toResponse(t);
                }
            }
            u.setPdvTerminalId(null);
            usuarioRepository.save(u);
        }

        /* Reutiliza PDV já cadastrado no monitor que ainda não tem usuário vinculado (ex.: Caixa 02 livre). */
        Optional<PdvTerminal> disponivel = primeiroTerminalSemUsuarioVinculado(empresaId);
        if (disponivel.isPresent()) {
            PdvTerminal t = disponivel.get();
            u.setPdvTerminalId(t.getId());
            usuarioRepository.save(u);
            return toResponse(t);
        }

        String codigo = proximoCodigoNumericoDisponivel(empresaId);
        String nome = "Caixa " + codigo;
        PdvTerminal novo = PdvTerminal.builder()
                .empresaId(empresaId)
                .codigo(codigo)
                .nome(nome)
                .ativo(true)
                .build();
        novo = pdvTerminalRepository.save(novo);
        u.setPdvTerminalId(novo.getId());
        usuarioRepository.save(u);
        return toResponse(novo);
    }

    /**
     * Primeiro caixa da empresa (por código) ativo e sem nenhum usuário com pdv_terminal_id apontando para ele.
     */
    private Optional<PdvTerminal> primeiroTerminalSemUsuarioVinculado(long empresaId) {
        List<PdvTerminal> lista = pdvTerminalRepository.findByEmpresaIdOrderByCodigoAsc(empresaId);
        lista.sort(this::compareCodigoPdv);
        for (PdvTerminal t : lista) {
            if (!t.isAtivo()) {
                continue;
            }
            if (usuarioRepository.findByPdvTerminalId(t.getId()).isEmpty()) {
                return Optional.of(t);
            }
        }
        return Optional.empty();
    }

    private int compareCodigoPdv(PdvTerminal a, PdvTerminal b) {
        String ca = a.getCodigo() != null ? a.getCodigo().trim() : "";
        String cb = b.getCodigo() != null ? b.getCodigo().trim() : "";
        boolean na = ca.matches("\\d+");
        boolean nb = cb.matches("\\d+");
        if (na && nb) {
            return Integer.compare(Integer.parseInt(ca), Integer.parseInt(cb));
        }
        return ca.compareToIgnoreCase(cb);
    }

    private String proximoCodigoNumericoDisponivel(long empresaId) {
        List<PdvTerminal> list = pdvTerminalRepository.findByEmpresaIdOrderByCodigoAsc(empresaId);
        int max = 0;
        for (PdvTerminal t : list) {
            String c = t.getCodigo() != null ? t.getCodigo().trim() : "";
            if (c.matches("\\d+")) {
                try {
                    max = Math.max(max, Integer.parseInt(c));
                } catch (NumberFormatException ignored) {
                }
            }
        }
        int next = max + 1;
        while (next < 100000) {
            String cod = next < 100 ? String.format("%02d", next) : String.valueOf(next);
            if (pdvTerminalRepository.findByEmpresaIdAndCodigoIgnoreCase(empresaId, cod).isEmpty()) {
                return cod;
            }
            next++;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não foi possível gerar código de caixa automático");
    }

    @Transactional
    public PdvTerminalResponse atualizarTerminal(Long id, Long empresaId, PdvTerminalUpdateRequest req) {
        PdvTerminal t = pdvTerminalRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Terminal não encontrado"));
        if (!t.getEmpresaId().equals(empresaId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "PDV pertence a outra empresa");
        }
        if (req.getNome() != null) {
            String n = req.getNome().trim();
            t.setNome(n.isEmpty() ? null : n);
        }
        if (req.getAtivo() != null) {
            t.setAtivo(req.getAtivo());
        }
        if (req.getCodigo() != null && !req.getCodigo().isBlank()) {
            String nc = req.getCodigo().trim();
            if (nc.length() > 50) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Código: máximo 50 caracteres");
            }
            if (!nc.equalsIgnoreCase(t.getCodigo())
                    && pdvTerminalRepository.findByEmpresaIdAndCodigoIgnoreCase(empresaId, nc).isPresent()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe PDV com este código nesta empresa");
            }
            t.setCodigo(nc);
        }
        return toResponse(pdvTerminalRepository.save(t));
    }

    @Transactional
    public void heartbeat(PdvHeartbeatRequest req, Authentication auth) {
        if (req.getTerminalId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "terminalId obrigatório");
        }
        if (auth != null && auth.getPrincipal() instanceof Usuario authUser) {
            Usuario u = reloadUsuario(authUser);
            if (u.getPdvTerminalId() != null && !u.getPdvTerminalId().equals(req.getTerminalId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Sinal permitido apenas no PDV vinculado ao seu usuário.");
            }
        }
        PdvTerminal t = pdvTerminalRepository.findById(req.getTerminalId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Terminal não encontrado"));
        if (!t.isAtivo()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "PDV desativado");
        }
        String operador = "—";
        if (auth != null && auth.getPrincipal() instanceof Usuario u) {
            operador = u.getUsername();
        } else if (auth != null) {
            operador = auth.getName();
        }
        t.setUltimoHeartbeat(Instant.now());
        t.setUltimoOperador(operador);
        pdvTerminalRepository.save(t);
    }

    /**
     * Encerra a sessão do operador neste terminal (monitor deixa de exibir o operador atual).
     */
    @Transactional
    public void encerrarSessaoOperador(Long terminalId) {
        if (terminalId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "terminalId obrigatório");
        }
        PdvTerminal t = pdvTerminalRepository.findById(terminalId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Terminal não encontrado"));
        t.setUltimoOperador(null);
        pdvTerminalRepository.save(t);
    }

    private PdvTerminalResponse toResponse(PdvTerminal t) {
        Instant hb = t.getUltimoHeartbeat();
        boolean online = hb != null && Duration.between(hb, Instant.now()).getSeconds() < ONLINE_THRESHOLD_SECONDS;
        return PdvTerminalResponse.builder()
                .id(t.getId())
                .empresaId(t.getEmpresaId())
                .codigo(t.getCodigo())
                .nome(t.getNome())
                .ativo(t.isAtivo())
                .ultimoHeartbeat(hb)
                .ultimoOperador(t.getUltimoOperador())
                .online(online)
                .build();
    }
}
