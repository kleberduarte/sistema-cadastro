package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.OrdemServicoFechamentoRequest;
import com.sistema.cadastro.dto.OrdemServicoRequest;
import com.sistema.cadastro.dto.OrdemServicoResponse;
import com.sistema.cadastro.model.OrdemServico;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.model.Venda;
import com.sistema.cadastro.repository.OrdemServicoRepository;
import com.sistema.cadastro.repository.UsuarioRepository;
import com.sistema.cadastro.repository.VendaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrdemServicoService {
    public static final String STATUS_ABERTA = "ABERTA";
    public static final String STATUS_EM_ANALISE = "EM_ANALISE";
    public static final String STATUS_AGUARDANDO_APROVACAO = "AGUARDANDO_APROVACAO";
    public static final String STATUS_CONCLUIDA = "CONCLUIDA";
    public static final String STATUS_ENTREGUE = "ENTREGUE";
    public static final String STATUS_CANCELADA = "CANCELADA";

    private static final Set<String> STATUS_VALIDOS = Set.of(
            STATUS_ABERTA,
            STATUS_EM_ANALISE,
            STATUS_AGUARDANDO_APROVACAO,
            STATUS_CONCLUIDA,
            STATUS_ENTREGUE,
            STATUS_CANCELADA
    );

    private final OrdemServicoRepository ordemServicoRepository;
    private final EmpresaScopeService empresaScopeService;
    private final ParametroEmpresaService parametroEmpresaService;
    private final VendaRepository vendaRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public OrdemServicoResponse criar(OrdemServicoRequest request, Usuario logado, Long empresaIdParam) {
        long empresaId = empresaScopeService.resolveForWrite(logado, empresaIdParam);
        assertModuloAtivo(empresaId);
        validarCamposObrigatorios(request);

        OrdemServico os = new OrdemServico();
        os.setEmpresaId(empresaId);
        os.setNumeroOs(proximoNumeroOs(empresaId));
        preencherCamposEditaveis(os, request);
        os.setStatus(normalizeStatus(request.getStatus(), STATUS_ABERTA));
        os.setDataAbertura(LocalDateTime.now());
        recalcularTotais(os);
        return toResponse(ordemServicoRepository.save(os));
    }

    @Transactional(readOnly = true)
    public List<OrdemServicoResponse> listar(Usuario u, Long empresaIdParam, String status, LocalDateTime inicio, LocalDateTime fim) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        List<OrdemServico> list;
        if (scope.isEmpty()) {
            list = ordemServicoRepository.findAll().stream()
                    .sorted((a, b) -> nullSafeDate(b.getDataAbertura()).compareTo(nullSafeDate(a.getDataAbertura())))
                    .collect(Collectors.toList());
        } else if (inicio != null && fim != null) {
            list = ordemServicoRepository.findByEmpresaIdAndDataAberturaBetween(scope.get(), inicio, fim);
        } else if (status != null && !status.trim().isEmpty()) {
            list = ordemServicoRepository.findByEmpresaIdAndStatusOrderByDataAberturaDesc(scope.get(), normalizeStatus(status, STATUS_ABERTA));
        } else {
            list = ordemServicoRepository.findByEmpresaIdOrderByDataAberturaDesc(scope.get());
        }
        return list.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<OrdemServicoResponse> buscarPorId(Long id, Usuario u, Long empresaIdParam) {
        return ordemServicoRepository.findById(id)
                .map(os -> {
                    assertReadable(u, os, empresaIdParam);
                    return toResponse(os);
                });
    }

    @Transactional
    public OrdemServicoResponse atualizar(Long id, OrdemServicoRequest request, Usuario u, Long empresaIdParam) {
        OrdemServico os = ordemServicoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "OS não encontrada."));
        assertWritable(u, os, empresaIdParam);
        validarCamposObrigatorios(request);

        preencherCamposEditaveis(os, request);
        recalcularTotais(os);

        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            String novoStatus = normalizeStatus(request.getStatus(), os.getStatus());
            validarTransicaoStatus(os.getStatus(), novoStatus);
            aplicarStatus(os, novoStatus);
        }
        return toResponse(ordemServicoRepository.save(os));
    }

    @Transactional
    public OrdemServicoResponse alterarStatus(Long id, String status, Usuario u, Long empresaIdParam) {
        OrdemServico os = ordemServicoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "OS não encontrada."));
        assertWritable(u, os, empresaIdParam);
        String novoStatus = normalizeStatus(status, os.getStatus());
        validarTransicaoStatus(os.getStatus(), novoStatus);
        aplicarStatus(os, novoStatus);
        return toResponse(ordemServicoRepository.save(os));
    }

    @Transactional
    public OrdemServicoResponse fechar(Long id, OrdemServicoFechamentoRequest request, Usuario u, Long empresaIdParam) {
        OrdemServico os = ordemServicoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "OS não encontrada."));
        assertWritable(u, os, empresaIdParam);

        boolean gerarVenda = request != null && Boolean.TRUE.equals(request.getGerarVenda());
        validarTransicaoStatus(os.getStatus(), STATUS_CONCLUIDA);
        aplicarStatus(os, STATUS_CONCLUIDA);

        if (gerarVenda) {
            if (os.getVendaId() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OS já possui venda vinculada.");
            }
            Long vendaId = gerarVendaAPartirDaOS(os, u, request);
            os.setVendaId(vendaId);
        }
        return toResponse(ordemServicoRepository.save(os));
    }

    @Transactional
    public void deletar(Long id, Usuario u, Long empresaIdParam) {
        OrdemServico os = ordemServicoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "OS não encontrada."));
        assertWritable(u, os, empresaIdParam);
        ordemServicoRepository.delete(os);
    }

    private void assertModuloAtivo(long empresaId) {
        boolean ativo = parametroEmpresaService.buscarPorEmpresaId(empresaId)
                .map(p -> Boolean.TRUE.equals(p.getModuloInformaticaAtivo()))
                .orElse(false);
        if (!ativo) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Módulo Informática não está ativo para esta empresa.");
        }
    }

    private void validarCamposObrigatorios(OrdemServicoRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados da OS são obrigatórios.");
        }
        if (isBlank(request.getEquipamento())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o equipamento da OS.");
        }
    }

    private Long proximoNumeroOs(long empresaId) {
        Long max = ordemServicoRepository.maxNumeroByEmpresaId(empresaId);
        return (max == null ? 1L : max + 1L);
    }

    private void preencherCamposEditaveis(OrdemServico os, OrdemServicoRequest req) {
        os.setClienteId(req.getClienteId());
        os.setNomeCliente(trimToNull(req.getNomeCliente()));
        os.setContatoCliente(trimToNull(req.getContatoCliente()));
        os.setCodigoCliente(trimToNull(req.getCodigoCliente()));
        os.setTelefoneCliente(trimToNull(req.getTelefoneCliente()));
        os.setSetorCliente(trimToNull(req.getSetorCliente()));
        os.setNomeContato(trimToNull(req.getNomeContato()));
        os.setEquipamento(trimToNull(req.getEquipamento()));
        os.setMarca(trimToNull(req.getMarca()));
        os.setModelo(trimToNull(req.getModelo()));
        os.setNumeroSerie(trimToNull(req.getNumeroSerie()));
        os.setPatrimonio(trimToNull(req.getPatrimonio()));
        os.setAcessorios(trimToNull(req.getAcessorios()));
        os.setTipoOrdemServico(trimToNull(req.getTipoOrdemServico()));
        os.setDefeitoRelatado(trimToNull(req.getDefeitoRelatado()));
        os.setDiagnostico(trimToNull(req.getDiagnostico()));
        os.setServicoExecutado(trimToNull(req.getServicoExecutado()));
        os.setTecnicoResponsavel(trimToNull(req.getTecnicoResponsavel()));
        os.setObservacao(trimToNull(req.getObservacao()));
        os.setContratoIdentificacao(trimToNull(req.getContratoIdentificacao()));
        os.setNfCompra(trimToNull(req.getNfCompra()));
        os.setDataCompra(req.getDataCompra());
        os.setLojaCompra(trimToNull(req.getLojaCompra()));
        os.setNumeroCertificado(trimToNull(req.getNumeroCertificado()));
        os.setSenhaEquipamento(trimToNull(req.getSenhaEquipamento()));
        os.setOsExterna(trimToNull(req.getOsExterna()));
        os.setValorServico(nonNegative(req.getValorServico()));
        os.setDesconto(nonNegative(req.getDesconto()));
        os.setValorTotal(nonNegative(req.getValorTotal()));
        os.setDataPrevisaoEntrega(req.getDataPrevisaoEntrega());
    }

    private void recalcularTotais(OrdemServico os) {
        BigDecimal valorServico = nonNegative(os.getValorServico());
        BigDecimal desconto = nonNegative(os.getDesconto());
        BigDecimal totalInformado = nonNegative(os.getValorTotal());
        BigDecimal totalCalculado = valorServico.subtract(desconto);
        if (totalCalculado.compareTo(BigDecimal.ZERO) < 0) {
            totalCalculado = BigDecimal.ZERO;
        }
        os.setValorServico(valorServico);
        os.setDesconto(desconto);
        os.setValorTotal(totalInformado.compareTo(BigDecimal.ZERO) > 0 ? totalInformado : totalCalculado);
    }

    private void validarTransicaoStatus(String atual, String novo) {
        String statusAtual = normalizeStatus(atual, STATUS_ABERTA);
        String statusNovo = normalizeStatus(novo, statusAtual);
        if (Objects.equals(statusAtual, statusNovo)) return;

        if (STATUS_CANCELADA.equals(statusAtual) || STATUS_ENTREGUE.equals(statusAtual)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status final não permite alterações.");
        }
        if (STATUS_CONCLUIDA.equals(statusAtual) && STATUS_EM_ANALISE.equals(statusNovo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OS concluída não pode voltar para EM_ANALISE.");
        }
    }

    private void aplicarStatus(OrdemServico os, String novoStatus) {
        String s = normalizeStatus(novoStatus, STATUS_ABERTA);
        os.setStatus(s);
        if (STATUS_CONCLUIDA.equals(s) && os.getDataConclusao() == null) {
            os.setDataConclusao(LocalDateTime.now());
        }
        if (STATUS_ENTREGUE.equals(s) && os.getDataEntrega() == null) {
            if (os.getDataConclusao() == null) {
                os.setDataConclusao(LocalDateTime.now());
            }
            os.setDataEntrega(LocalDateTime.now());
        }
    }

    private Long gerarVendaAPartirDaOS(OrdemServico os, Usuario u, OrdemServicoFechamentoRequest request) {
        Usuario operador = usuarioRepository.findById(u.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usuário operador não encontrado."));

        Venda venda = new Venda();
        venda.setEmpresaId(os.getEmpresaId());
        venda.setUsuario(operador);
        venda.setNomeOperador(operador.getUsername());
        venda.setItens(List.of());
        venda.setSubtotal(nonNegative(os.getValorServico()));
        venda.setDesconto(nonNegative(os.getDesconto()));
        venda.setTotal(nonNegative(os.getValorTotal()));
        venda.setFormaPagamento(trimToNull(request != null ? request.getFormaPagamento() : null));
        Integer parcelas = request != null ? request.getParcelas() : null;
        if (parcelas != null && parcelas > 0) {
            venda.setParcelas(parcelas);
        } else {
            venda.setParcelas(null);
        }
        venda.setChavePix(null);
        venda.setCpfCliente(null);
        return vendaRepository.save(venda).getId();
    }

    private void assertReadable(Usuario u, OrdemServico os, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        if (scope.isEmpty()) {
            return;
        }
        if (!scope.get().equals(os.getEmpresaId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem acesso a OS de outra empresa.");
        }
    }

    private void assertWritable(Usuario u, OrdemServico os, Long empresaIdParam) {
        long scope = empresaScopeService.resolveForWrite(u, empresaIdParam);
        if (!Long.valueOf(scope).equals(os.getEmpresaId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem acesso para alterar OS de outra empresa.");
        }
    }

    private OrdemServicoResponse toResponse(OrdemServico os) {
        return new OrdemServicoResponse(
                os.getId(),
                os.getEmpresaId(),
                os.getNumeroOs(),
                os.getClienteId(),
                os.getNomeCliente(),
                os.getContatoCliente(),
                os.getCodigoCliente(),
                os.getTelefoneCliente(),
                os.getSetorCliente(),
                os.getNomeContato(),
                os.getEquipamento(),
                os.getMarca(),
                os.getModelo(),
                os.getNumeroSerie(),
                os.getPatrimonio(),
                os.getAcessorios(),
                os.getTipoOrdemServico(),
                os.getDefeitoRelatado(),
                os.getDiagnostico(),
                os.getServicoExecutado(),
                os.getTecnicoResponsavel(),
                os.getObservacao(),
                os.getContratoIdentificacao(),
                os.getNfCompra(),
                os.getDataCompra(),
                os.getLojaCompra(),
                os.getNumeroCertificado(),
                os.getSenhaEquipamento(),
                os.getOsExterna(),
                os.getValorServico(),
                os.getDesconto(),
                os.getValorTotal(),
                os.getStatus(),
                os.getDataAbertura(),
                os.getDataPrevisaoEntrega(),
                os.getDataConclusao(),
                os.getDataEntrega(),
                os.getVendaId(),
                os.getCreatedAt(),
                os.getUpdatedAt()
        );
    }

    private static String normalizeStatus(String raw, String fallback) {
        String f = fallback == null ? STATUS_ABERTA : fallback.trim().toUpperCase();
        if (raw == null || raw.trim().isEmpty()) {
            return STATUS_VALIDOS.contains(f) ? f : STATUS_ABERTA;
        }
        String n = raw.trim().toUpperCase();
        if (!STATUS_VALIDOS.contains(n)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Status inválido. Use: " + Arrays.toString(STATUS_VALIDOS.toArray()));
        }
        return n;
    }

    private static BigDecimal nonNegative(BigDecimal value) {
        if (value == null) return BigDecimal.ZERO;
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valores monetários não podem ser negativos.");
        }
        return value;
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static LocalDateTime nullSafeDate(LocalDateTime d) {
        return d == null ? LocalDateTime.MIN : d;
    }
}
