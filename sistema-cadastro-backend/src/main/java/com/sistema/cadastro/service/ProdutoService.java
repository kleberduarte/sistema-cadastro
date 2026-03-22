package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.ProdutoRequest;
import com.sistema.cadastro.dto.ProdutoImportConfirmResponseDTO;
import com.sistema.cadastro.dto.ProdutoImportPreviewItemDTO;
import com.sistema.cadastro.dto.ProdutoImportPreviewResponseDTO;
import com.sistema.cadastro.dto.ProdutoResponse;
import com.sistema.cadastro.model.Produto;
import com.sistema.cadastro.model.Role;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.repository.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.LinkedHashMap;
import java.util.ArrayList;
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
    public Page<ProdutoResponse> findPage(Usuario u, Long empresaIdParam, String q, Pageable pageable) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        Long eid = scope.orElse(null);
        String term = q == null ? "" : q.trim();

        Page<Produto> page;
        if (!term.isEmpty()) {
            page = produtoRepository.searchPage(term, eid, pageable);
        } else if (scope.isEmpty()) {
            page = produtoRepository.findAll(pageable);
        } else {
            page = produtoRepository.findByEmpresaId(scope.get(), pageable);
        }

        List<ProdutoResponse> content = page.getContent().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return new PageImpl<>(content, pageable, page.getTotalElements());
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

    @Transactional
    public long deleteAllByEmpresa(Usuario u, Long empresaIdParam) {
        long empresaId = empresaScopeService.resolveForWrite(u, empresaIdParam);
        return produtoRepository.deleteByEmpresaId(empresaId);
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
    public List<String> listCategorias(Usuario u, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        Long eid = scope.orElse(null);
        return produtoRepository.findDistinctCategoriasScoped(eid);
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

    @Transactional(readOnly = true)
    public ProdutoImportPreviewResponseDTO previewImportCsv(MultipartFile file, Usuario u, Long empresaIdParam) {
        long empresaId = empresaScopeService.resolveForWrite(u, empresaIdParam);
        List<ParsedRow> rows = parseCsv(file);
        List<ProdutoImportPreviewItemDTO> itens = new ArrayList<>();
        int validas = 0;
        int invalidas = 0;
        int criar = 0;
        int atualizar = 0;

        for (ParsedRow row : rows) {
            if (row.erro != null) {
                invalidas++;
                itens.add(toPreviewItem(row, "INVALID", row.erro));
                continue;
            }
            validas++;
            Optional<Produto> existente = produtoRepository.findByEmpresaIdAndCodigoProduto(empresaId, row.codigoProduto);
            if (existente.isPresent()) {
                atualizar++;
                itens.add(toPreviewItem(row, "UPDATE", "Produto existente nesta empresa"));
            } else {
                criar++;
                itens.add(toPreviewItem(row, "CREATE", "Novo produto"));
            }
        }

        return ProdutoImportPreviewResponseDTO.builder()
                .empresaId(empresaId)
                .totalLinhas(rows.size())
                .validas(validas)
                .invalidas(invalidas)
                .criar(criar)
                .atualizar(atualizar)
                .itens(itens)
                .build();
    }

    @Transactional
    public ProdutoImportConfirmResponseDTO confirmImportCsv(MultipartFile file, Usuario u, Long empresaIdParam) {
        long empresaId = empresaScopeService.resolveForWrite(u, empresaIdParam);
        List<ParsedRow> rows = parseCsv(file);
        List<ProdutoImportPreviewItemDTO> detalhes = new ArrayList<>();
        int criados = 0;
        int atualizados = 0;
        int ignorados = 0;
        int erros = 0;

        for (ParsedRow row : rows) {
            if (row.erro != null) {
                erros++;
                detalhes.add(toPreviewItem(row, "INVALID", row.erro));
                continue;
            }
            Optional<Produto> existente = produtoRepository.findByEmpresaIdAndCodigoProduto(empresaId, row.codigoProduto);
            try {
                if (existente.isPresent()) {
                    Produto p = existente.get();
                    p.setNome(row.nome);
                    p.setPreco(row.preco);
                    p.setQuantidadeEstoque(row.estoque);
                    p.setCategoria(row.categoria);
                    p.setDescricao(row.descricao);
                    p.setTipo(row.tipo);
                    if (row.estoqueMinimo != null) {
                        p.setEstoqueMinimo(row.estoqueMinimo);
                    }
                    produtoRepository.save(p);
                    atualizados++;
                    detalhes.add(toPreviewItem(row, "UPDATE", "Atualizado"));
                } else {
                    Produto p = new Produto();
                    p.setEmpresaId(empresaId);
                    p.setCodigoProduto(row.codigoProduto);
                    p.setNome(row.nome);
                    p.setPreco(row.preco);
                    p.setQuantidadeEstoque(row.estoque);
                    p.setCategoria(row.categoria);
                    p.setDescricao(row.descricao);
                    p.setTipo(row.tipo);
                    p.setEstoqueMinimo(row.estoqueMinimo != null ? row.estoqueMinimo : 0);
                    p.setEmPromocao(false);
                    produtoRepository.save(p);
                    criados++;
                    detalhes.add(toPreviewItem(row, "CREATE", "Criado"));
                }
            } catch (Exception e) {
                erros++;
                ignorados++;
                detalhes.add(toPreviewItem(row, "INVALID", "Falha ao persistir: " + e.getMessage()));
            }
        }

        return ProdutoImportConfirmResponseDTO.builder()
                .empresaId(empresaId)
                .totalLinhas(rows.size())
                .criados(criados)
                .atualizados(atualizados)
                .ignorados(ignorados)
                .erros(erros)
                .detalhes(detalhes)
                .build();
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

    private ProdutoImportPreviewItemDTO toPreviewItem(ParsedRow row, String acao, String motivo) {
        return ProdutoImportPreviewItemDTO.builder()
                .linha(row.linha)
                .codigoProduto(row.codigoProduto)
                .nome(row.nome)
                .acao(acao)
                .motivo(motivo)
                .build();
    }

    private List<ParsedRow> parseCsv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo CSV não enviado.");
        }
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null || headerLine.trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo CSV vazio.");
            }
            String delimiter = headerLine.contains(";") ? ";" : ",";
            String[] headers = splitCsvLine(headerLine, delimiter);
            Map<String, Integer> indexByHeader = new LinkedHashMap<>();
            for (int i = 0; i < headers.length; i++) {
                indexByHeader.put(normalizeHeader(headers[i]), i);
            }
            ensureRequiredHeader(indexByHeader, "codigo");
            ensureRequiredHeader(indexByHeader, "nome");
            ensureRequiredHeader(indexByHeader, "preco");
            ensureRequiredHeader(indexByHeader, "estoque");

            List<ParsedRow> rows = new ArrayList<>();
            String line;
            int lineNo = 1;
            while ((line = reader.readLine()) != null) {
                lineNo++;
                if (line.trim().isEmpty()) continue;
                String[] cols = splitCsvLine(line, delimiter);
                ParsedRow row = new ParsedRow();
                row.linha = lineNo;
                try {
                    row.codigoProduto = trimToNull(getValue(cols, indexByHeader, "codigo"));
                    row.nome = trimToNull(getValue(cols, indexByHeader, "nome"));
                    row.preco = parseMoney(getValue(cols, indexByHeader, "preco"));
                    row.estoque = parseInt(getValue(cols, indexByHeader, "estoque"), "estoque");
                    row.categoria = trimToNull(getValue(cols, indexByHeader, "categoria"));
                    row.descricao = trimToNull(getValue(cols, indexByHeader, "descricao"));
                    row.tipo = trimToNull(getValue(cols, indexByHeader, "tipo"));
                    String estMinRaw = trimToNull(getValue(cols, indexByHeader, "estoque_minimo"));
                    row.estoqueMinimo = estMinRaw == null ? null : parseInt(estMinRaw, "estoque_minimo");
                    validateRow(row);
                } catch (Exception ex) {
                    row.erro = ex.getMessage();
                }
                rows.add(row);
            }
            return rows;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falha ao ler CSV: " + e.getMessage());
        }
    }

    private static String[] splitCsvLine(String line, String delimiter) {
        return line.split(delimiter, -1);
    }

    private static String normalizeHeader(String h) {
        if (h == null) return "";
        return h
                .replace("\uFEFF", "")
                .trim().toLowerCase()
                .replace("ç", "c")
                .replace("ã", "a")
                .replace("á", "a")
                .replace("â", "a")
                .replace("é", "e")
                .replace("ê", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ô", "o")
                .replace("õ", "o")
                .replace("ú", "u")
                .replace(" ", "_");
    }

    private static void ensureRequiredHeader(Map<String, Integer> map, String header) {
        if (!map.containsKey(header)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CSV sem coluna obrigatória: " + header);
        }
    }

    private static String getValue(String[] cols, Map<String, Integer> idx, String key) {
        Integer i = idx.get(key);
        if (i == null || i < 0 || i >= cols.length) return null;
        return cols[i];
    }

    private static String trimToNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }

    private static BigDecimal parseMoney(String v) {
        String t = trimToNull(v);
        if (t == null) throw new IllegalArgumentException("preco obrigatório");
        if (t.contains(",") && t.contains(".")) {
            // Formato com milhar e decimal (ex.: 1.234,56)
            t = t.replace(".", "").replace(",", ".");
        } else if (t.contains(",")) {
            // Formato decimal com vírgula (ex.: 89,90)
            t = t.replace(",", ".");
        }
        BigDecimal parsed = new BigDecimal(t);
        if (parsed.signum() < 0) throw new IllegalArgumentException("preco não pode ser negativo");
        return parsed;
    }

    private static Integer parseInt(String v, String field) {
        String t = trimToNull(v);
        if (t == null) throw new IllegalArgumentException(field + " obrigatório");
        int parsed = Integer.parseInt(t);
        if (parsed < 0) throw new IllegalArgumentException(field + " não pode ser negativo");
        return parsed;
    }

    private void validateRow(ParsedRow row) {
        row.codigoProduto = normalizeCodigoProduto(row.codigoProduto);
        if (row.codigoProduto == null) throw new IllegalArgumentException("codigo obrigatório");
        if (row.nome == null) throw new IllegalArgumentException("nome obrigatório");
        if (row.nome.length() > 200) throw new IllegalArgumentException("nome excede 200 caracteres");
        if (row.tipo != null && row.tipo.length() > 20) throw new IllegalArgumentException("tipo excede 20 caracteres");
        if (row.categoria != null && row.categoria.length() > 50) throw new IllegalArgumentException("categoria excede 50 caracteres");
    }

    private static class ParsedRow {
        int linha;
        String codigoProduto;
        String nome;
        BigDecimal preco;
        Integer estoque;
        String categoria;
        String descricao;
        String tipo;
        Integer estoqueMinimo;
        String erro;
    }
}
