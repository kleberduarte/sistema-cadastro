package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.ProdutoRequest;
import com.sistema.cadastro.dto.ProdutoResponse;
import com.sistema.cadastro.model.Produto;
import com.sistema.cadastro.model.Role;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.repository.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProdutoService {

    private final ProdutoRepository produtoRepository;
    private final EmpresaScopeService empresaScopeService;

    @Transactional
    public ProdutoResponse create(ProdutoRequest request, long empresaId) {
        String codigoNormalizado = normalizeCodigoProduto(request.getCodigoProduto());
        validateCodigoProdutoDuplicado(codigoNormalizado, null, empresaId);
        validatePromoQtd(request);

        Produto produto = new Produto();
        produto.setEmpresaId(empresaId);
        produto.setNome(request.getNome());
        produto.setDescricao(request.getDescricao());
        produto.setPreco(request.getPreco());

        produto.setPrecoPromocional(request.getPrecoPromocional());
        produto.setPromocaoInicio(request.getPromocaoInicio());
        produto.setPromocaoFim(request.getPromocaoFim());
        produto.setEmPromocao(request.getEmPromocao() != null ? request.getEmPromocao() : false);

        produto.setPromoQtdLevar(request.getPromoQtdLevar());
        produto.setPromoQtdPagar(request.getPromoQtdPagar());

        produto.setQuantidadeEstoque(request.getQuantidadeEstoque());
        produto.setEstoqueMinimo(request.getEstoqueMinimo() != null ? request.getEstoqueMinimo() : 0);
        produto.setCategoria(request.getCategoria());
        produto.setCodigoProduto(codigoNormalizado);
        produto.setTipo(request.getTipo());

        Produto saved = produtoRepository.save(produto);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ProdutoResponse> findAll(Usuario u, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        if (scope.isEmpty()) {
            return produtoRepository.findAll().stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }
        return produtoRepository.findByEmpresaId(scope.get()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProdutoResponse findById(Long id, Usuario u, Long empresaIdParam) {
        Produto produto = produtoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado"));
        assertProdutoReadable(u, produto, empresaIdParam);
        return toResponse(produto);
    }

    @Transactional
    public ProdutoResponse update(Long id, ProdutoRequest request, Usuario u, Long empresaIdParam) {
        Produto produto = produtoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado"));
        assertProdutoReadable(u, produto, empresaIdParam);

        String codigoNormalizado = normalizeCodigoProduto(request.getCodigoProduto());
        validateCodigoProdutoDuplicado(codigoNormalizado, id, produto.getEmpresaId());
        validatePromoQtd(request);

        produto.setNome(request.getNome());
        produto.setDescricao(request.getDescricao());
        produto.setPreco(request.getPreco());

        produto.setPrecoPromocional(request.getPrecoPromocional());
        produto.setPromocaoInicio(request.getPromocaoInicio());
        produto.setPromocaoFim(request.getPromocaoFim());
        produto.setEmPromocao(request.getEmPromocao() != null ? request.getEmPromocao() : false);

        produto.setPromoQtdLevar(request.getPromoQtdLevar());
        produto.setPromoQtdPagar(request.getPromoQtdPagar());

        produto.setQuantidadeEstoque(request.getQuantidadeEstoque());
        produto.setEstoqueMinimo(request.getEstoqueMinimo() != null ? request.getEstoqueMinimo() : 0);
        produto.setCategoria(request.getCategoria());
        produto.setCodigoProduto(codigoNormalizado);
        produto.setTipo(request.getTipo());

        Produto updated = produtoRepository.save(produto);
        return toResponse(updated);
    }

    @Transactional
    public void delete(Long id, Usuario u, Long empresaIdParam) {
        Produto produto = produtoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado"));
        assertProdutoReadable(u, produto, empresaIdParam);
        produtoRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<ProdutoResponse> search(String term, Usuario u, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        Long eid = scope.orElse(null);
        return produtoRepository.search(term, eid).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProdutoResponse> findByCategoria(String categoria, Usuario u, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        Long eid = scope.orElse(null);
        return produtoRepository.findByCategoriaScoped(categoria, eid).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProdutoResponse findByCodigoProduto(String codigoProduto, Usuario u, Long empresaIdParam) {
        long empresaId = empresaScopeService.resolveForWrite(u, empresaIdParam);
        String cod = normalizeCodigoProduto(codigoProduto);
        if (cod == null) {
            throw new RuntimeException("Código inválido");
        }
        return produtoRepository.findByEmpresaIdAndCodigoProduto(empresaId, cod)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado para o código informado"));
    }

    private void assertProdutoReadable(Usuario u, Produto p, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        if (scope.isEmpty()) {
            if (u.getRole() == Role.ADM) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (!p.getEmpresaId().equals(scope.get())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Produto de outra empresa.");
        }
    }

    private String normalizeCodigoProduto(String codigoProduto) {
        if (codigoProduto == null) return null;
        String normalized = codigoProduto.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private void validateCodigoProdutoDuplicado(String codigoProduto, Long currentProductId, long empresaId) {
        if (codigoProduto == null) return;

        boolean exists = (currentProductId == null)
                ? produtoRepository.existsByEmpresaIdAndCodigoProduto(empresaId, codigoProduto)
                : produtoRepository.existsByEmpresaIdAndCodigoProdutoAndIdNot(empresaId, codigoProduto, currentProductId);

        if (exists) {
            throw new RuntimeException("Código de produto já cadastrado nesta empresa");
        }
    }

    private void validatePromoQtd(ProdutoRequest request) {
        Integer levar = request.getPromoQtdLevar();
        Integer pagar = request.getPromoQtdPagar();

        if (levar == null && pagar == null) return;

        if (levar == null || pagar == null) {
            throw new RuntimeException("Promoção por quantidade: informe 'Levar' e 'Pagar' juntos.");
        }

        if (pagar >= levar) {
            throw new RuntimeException("Promoção por quantidade: 'Pagar' deve ser menor que 'Levar'.");
        }
    }

    private ProdutoResponse toResponse(Produto produto) {
        ProdutoResponse response = new ProdutoResponse();
        response.setId(produto.getId());
        response.setEmpresaId(produto.getEmpresaId());
        response.setNome(produto.getNome());
        response.setDescricao(produto.getDescricao());
        response.setPreco(produto.getPreco());
        response.setPrecoPromocional(produto.getPrecoPromocional());
        response.setPromocaoInicio(produto.getPromocaoInicio());
        response.setPromocaoFim(produto.getPromocaoFim());
        response.setEmPromocao(produto.getEmPromocao());
        response.setPromoQtdLevar(produto.getPromoQtdLevar());
        response.setPromoQtdPagar(produto.getPromoQtdPagar());
        response.setQuantidadeEstoque(produto.getQuantidadeEstoque());
        response.setEstoqueMinimo(produto.getEstoqueMinimo());
        response.setCategoria(produto.getCategoria());
        response.setCodigoProduto(produto.getCodigoProduto());
        response.setTipo(produto.getTipo());
        response.setCreatedAt(produto.getCreatedAt());
        response.setUpdatedAt(produto.getUpdatedAt());

        return response;
    }
}
