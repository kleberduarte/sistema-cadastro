package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.FecharCaixaRequest;
import com.sistema.cadastro.dto.FechamentoCaixaResponse;
import com.sistema.cadastro.dto.FechamentoCaixaResumoResponse;
import com.sistema.cadastro.model.FechamentoCaixa;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.model.Venda;
import com.sistema.cadastro.repository.FechamentoCaixaRepository;
import com.sistema.cadastro.repository.VendaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FechamentoCaixaService {

    private final VendaRepository vendaRepository;
    private final FechamentoCaixaRepository fechamentoCaixaRepository;

    public FechamentoCaixaResumoResponse obterResumoHoje(Usuario usuarioLogado) {
        LocalDate hoje = LocalDate.now();
        LocalDateTime inicio = hoje.atStartOfDay();
        LocalDateTime fim = hoje.atTime(LocalTime.MAX);
        List<Venda> vendas = vendaRepository.findByUsuarioIdAndDataVendaBetween(usuarioLogado.getId(), inicio, fim);
        return calcularResumo(hoje, vendas);
    }

    @Transactional
    public FechamentoCaixaResponse fecharCaixa(Usuario usuarioLogado, FecharCaixaRequest request) {
        LocalDate hoje = LocalDate.now();
        LocalDateTime inicio = hoje.atStartOfDay();
        LocalDateTime fim = hoje.atTime(LocalTime.MAX);
        List<Venda> vendas = vendaRepository.findByUsuarioIdAndDataVendaBetween(usuarioLogado.getId(), inicio, fim);
        FechamentoCaixaResumoResponse resumo = calcularResumo(hoje, vendas);

        FechamentoCaixa entity = new FechamentoCaixa();
        entity.setEmpresaId(usuarioLogado.getEmpresaId() != null ? usuarioLogado.getEmpresaId() : 1L);
        entity.setTerminalId(request != null ? request.getTerminalId() : null);
        entity.setUsuario(usuarioLogado);
        entity.setNomeOperador(usuarioLogado.getUsername());
        entity.setDataReferencia(resumo.getDataReferencia());
        entity.setQuantidadeVendas(resumo.getQuantidadeVendas());
        entity.setTotalDinheiro(resumo.getTotalDinheiro());
        entity.setTotalCartao(resumo.getTotalCartao());
        entity.setTotalPix(resumo.getTotalPix());
        entity.setTotalGeral(resumo.getTotalGeral());

        BigDecimal valorInformado = request != null ? request.getValorInformadoDinheiro() : null;
        if (valorInformado != null) {
            valorInformado = valorInformado.setScale(2, RoundingMode.HALF_UP);
        }
        entity.setValorInformadoDinheiro(valorInformado);
        entity.setDiferencaDinheiro(valorInformado != null ? valorInformado.subtract(resumo.getTotalDinheiro()) : null);

        entity = fechamentoCaixaRepository.save(entity);
        return toResponse(entity);
    }

    public List<FechamentoCaixaResponse> listarHistoricoEmpresa(Long empresaId) {
        if (empresaId == null || empresaId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "empresaId inválido");
        }
        return fechamentoCaixaRepository.findTop100ByEmpresaIdOrderByDataFechamentoDesc(empresaId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private FechamentoCaixaResumoResponse calcularResumo(LocalDate data, List<Venda> vendas) {
        BigDecimal totalDinheiro = BigDecimal.ZERO;
        BigDecimal totalCartao = BigDecimal.ZERO;
        BigDecimal totalPix = BigDecimal.ZERO;

        for (Venda v : vendas) {
            BigDecimal total = Objects.requireNonNullElse(v.getTotal(), BigDecimal.ZERO);
            String forma = v.getFormaPagamento() != null
                    ? v.getFormaPagamento().trim().toUpperCase(Locale.ROOT)
                    : "";
            if (forma.contains("PIX")) {
                totalPix = totalPix.add(total);
            } else if (forma.contains("DINHEIRO")) {
                totalDinheiro = totalDinheiro.add(total);
            } else {
                totalCartao = totalCartao.add(total);
            }
        }

        BigDecimal geral = totalDinheiro.add(totalCartao).add(totalPix);
        return new FechamentoCaixaResumoResponse(
                data,
                vendas.size(),
                totalDinheiro.setScale(2, RoundingMode.HALF_UP),
                totalCartao.setScale(2, RoundingMode.HALF_UP),
                totalPix.setScale(2, RoundingMode.HALF_UP),
                geral.setScale(2, RoundingMode.HALF_UP)
        );
    }

    private FechamentoCaixaResponse toResponse(FechamentoCaixa f) {
        return new FechamentoCaixaResponse(
                f.getId(),
                f.getEmpresaId(),
                f.getTerminalId(),
                f.getUsuario() != null ? f.getUsuario().getId() : null,
                f.getNomeOperador(),
                f.getDataReferencia(),
                f.getQuantidadeVendas(),
                f.getTotalDinheiro(),
                f.getTotalCartao(),
                f.getTotalPix(),
                f.getTotalGeral(),
                f.getValorInformadoDinheiro(),
                f.getDiferencaDinheiro(),
                f.getDataFechamento()
        );
    }
}

