package com.sistema.cadastro.service;

import com.sistema.cadastro.model.ProdutoLote;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.repository.ProdutoLoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProdutoLoteService {
    private final EmpresaScopeService empresaScopeService;
    private final ProdutoLoteRepository produtoLoteRepository;
    private final FarmaciaSupportService farmaciaSupportService;

    @Transactional(readOnly = true)
    public List<ProdutoLote> listar(Usuario u, Long empresaIdParam, Long produtoId) {
        long empresaId = empresaScopeService.resolveForWrite(u, empresaIdParam);
        return produtoLoteRepository.findByEmpresaIdAndProdutoIdOrderByValidadeAscIdAsc(empresaId, produtoId);
    }

    @Transactional
    public ProdutoLote entrada(Usuario u, Long empresaIdParam, Long produtoId, String codigoLote, LocalDate validade, Integer quantidade) {
        if (quantidade == null || quantidade <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantidade deve ser positiva.");
        long empresaId = empresaScopeService.resolveForWrite(u, empresaIdParam);
        ProdutoLote lote = produtoLoteRepository.findByEmpresaIdAndProdutoIdAndCodigoLote(empresaId, produtoId, codigoLote)
                .orElseGet(() -> {
                    ProdutoLote n = new ProdutoLote();
                    n.setEmpresaId(empresaId);
                    n.setProdutoId(produtoId);
                    n.setCodigoLote(codigoLote);
                    n.setValidade(validade);
                    n.setQuantidadeAtual(0);
                    return n;
                });
        lote.setValidade(validade);
        lote.setQuantidadeAtual((lote.getQuantidadeAtual() == null ? 0 : lote.getQuantidadeAtual()) + quantidade);
        ProdutoLote saved = produtoLoteRepository.save(lote);
        farmaciaSupportService.audit(empresaId, u.getId(), "LOTE_ENTRADA", "PRODUTO_LOTE", saved.getId(),
                "produtoId=" + produtoId + ", lote=" + codigoLote + ", qtd=" + quantidade);
        return saved;
    }
}

