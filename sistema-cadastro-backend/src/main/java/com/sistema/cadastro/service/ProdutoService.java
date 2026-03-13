package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.ProdutoRequest;
import com.sistema.cadastro.dto.ProdutoResponse;
import com.sistema.cadastro.model.Produto;
import com.sistema.cadastro.repository.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProdutoService {

    private final ProdutoRepository produtoRepository;

    @Transactional
    public ProdutoResponse create(ProdutoRequest request) {
        String codigoNormalizado = normalizeCodigoProduto(request.getCodigoProduto());
        validateCodigoProdutoDuplicado(codigoNormalizado, null);

        Produto produto = new Produto();
        produto.setNome(request.getNome());
        produto.setDescricao(request.getDescricao());
        produto.setPreco(request.getPreco());
        produto.setQuantidadeEstoque(request.getQuantidadeEstoque());
        produto.setCategoria(request.getCategoria());
        produto.setCodigoProduto(codigoNormalizado);
        produto.setTipo(request.getTipo());

        Produto saved = produtoRepository.save(produto);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ProdutoResponse> findAll() {
        return produtoRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProdutoResponse findById(Long id) {
        return produtoRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado"));
    }

    @Transactional
    public ProdutoResponse update(Long id, ProdutoRequest request) {
        Produto produto = produtoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado"));

        String codigoNormalizado = normalizeCodigoProduto(request.getCodigoProduto());
        validateCodigoProdutoDuplicado(codigoNormalizado, id);
        
        produto.setNome(request.getNome());
        produto.setDescricao(request.getDescricao());
        produto.setPreco(request.getPreco());
        produto.setQuantidadeEstoque(request.getQuantidadeEstoque());
        produto.setCategoria(request.getCategoria());
        produto.setCodigoProduto(codigoNormalizado);
        produto.setTipo(request.getTipo());
        
        Produto updated = produtoRepository.save(produto);
        return toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        produtoRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<ProdutoResponse> search(String term) {
        return produtoRepository.search(term).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProdutoResponse> findByCategoria(String categoria) {
        return produtoRepository.findByCategoria(categoria).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProdutoResponse findByCodigoProduto(String codigoProduto) {
        return produtoRepository.findByCodigoProduto(codigoProduto)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado para o código informado"));
    }

    private String normalizeCodigoProduto(String codigoProduto) {
        if (codigoProduto == null) return null;
        String normalized = codigoProduto.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private void validateCodigoProdutoDuplicado(String codigoProduto, Long currentProductId) {
        if (codigoProduto == null) return;

        boolean exists = (currentProductId == null)
                ? produtoRepository.existsByCodigoProduto(codigoProduto)
                : produtoRepository.existsByCodigoProdutoAndIdNot(codigoProduto, currentProductId);

        if (exists) {
            throw new RuntimeException("Código de produto já cadastrado");
        }
    }

    private ProdutoResponse toResponse(Produto produto) {
        ProdutoResponse response = new ProdutoResponse();
        response.setId(produto.getId());
        response.setNome(produto.getNome());
        response.setDescricao(produto.getDescricao());
        response.setPreco(produto.getPreco());
        response.setQuantidadeEstoque(produto.getQuantidadeEstoque());
        response.setCategoria(produto.getCategoria());
        response.setCodigoProduto(produto.getCodigoProduto());
        response.setTipo(produto.getTipo());
        response.setCreatedAt(produto.getCreatedAt());
        response.setUpdatedAt(produto.getUpdatedAt());
        
        return response;
    }
}

