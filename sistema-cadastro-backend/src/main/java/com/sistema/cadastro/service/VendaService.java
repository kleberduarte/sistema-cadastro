package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.VendaRequest;
import com.sistema.cadastro.dto.VendaResponse;
import com.sistema.cadastro.dto.ParametroEmpresaDTO;
import com.sistema.cadastro.model.Produto;
import com.sistema.cadastro.model.Role;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.model.Venda;
import com.sistema.cadastro.model.VendaItem;
import com.sistema.cadastro.repository.ProdutoRepository;
import com.sistema.cadastro.repository.UsuarioRepository;
import com.sistema.cadastro.repository.VendaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VendaService {

    private final VendaRepository vendaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProdutoRepository produtoRepository;
    private final ParametroEmpresaService parametroEmpresaService;
    private final EmpresaScopeService empresaScopeService;

    @Transactional
    public VendaResponse criarVenda(VendaRequest request, Usuario logado, Long empresaIdParam) {
        if (logado.getRole() == Role.VENDEDOR && !logado.getId().equals(request.getUsuarioId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Vendedor só pode registrar venda em seu próprio usuário.");
        }

        Optional<Usuario> usuarioOpt = usuarioRepository.findById(request.getUsuarioId());
        if (usuarioOpt.isEmpty()) {
            throw new RuntimeException("Usuário não encontrado");
        }

        Usuario usuario = usuarioOpt.get();
        long empresaVenda = empresaScopeService.resolveForWrite(logado, empresaIdParam);

        long empresaVendedor = (usuario.getEmpresaId() != null && usuario.getEmpresaId() >= 1)
                ? usuario.getEmpresaId()
                : empresaScopeService.empresaPadrao();
        if (empresaVendedor != empresaVenda) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vendedor não pertence à empresa selecionada.");
        }

        Venda venda = new Venda();
        venda.setEmpresaId(empresaVenda);
        venda.setUsuario(usuario);
        venda.setNomeOperador(usuario.getUsername());

        List<VendaItem> itens = new ArrayList<>();
        for (VendaRequest.VendaItemRequest itemReq : request.getItens()) {
            Optional<Produto> produtoOpt = produtoRepository.findById(itemReq.getProdutoId());
            if (produtoOpt.isEmpty()) {
                throw new RuntimeException("Produto não encontrado: " + itemReq.getProdutoId());
            }

            Produto produto = produtoOpt.get();
            if (produto.getEmpresaId() == null || !produto.getEmpresaId().equals(empresaVenda)) {
                throw new RuntimeException("Produto não pertence à mesma empresa da venda: " + produto.getNome());
            }

            if (produto.getQuantidadeEstoque() < itemReq.getQuantidade()) {
                throw new RuntimeException("Estoque insuficiente para o produto: " + produto.getNome());
            }

            produto.setQuantidadeEstoque(produto.getQuantidadeEstoque() - itemReq.getQuantidade());
            produtoRepository.save(produto);

            VendaItem item = new VendaItem();
            item.setProdutoId(itemReq.getProdutoId());
            item.setNome(itemReq.getNome());
            item.setPreco(itemReq.getPreco());
            item.setQuantidade(itemReq.getQuantidade());
            item.setSubtotal(itemReq.getSubtotal());
            itens.add(item);
        }

        venda.setItens(itens);

        BigDecimal subtotal = itens.stream()
                .map(VendaItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        venda.setSubtotal(subtotal);
        venda.setDesconto(request.getDesconto() != null ? request.getDesconto() : BigDecimal.ZERO);
        venda.setTotal(subtotal.subtract(venda.getDesconto()));

        String formaPagamento = request.getFormaPagamento();
        venda.setFormaPagamento(formaPagamento);

        if (formaPagamento != null && formaPagamento.equalsIgnoreCase("CREDITO")) {
            Integer parcelas = request.getParcelas();
            venda.setParcelas(parcelas != null && parcelas > 0 ? parcelas : 1);
        } else {
            venda.setParcelas(null);
        }

        String chavePixRequest = request.getChavePix() != null ? request.getChavePix().trim() : null;
        String chavePixFinal = chavePixRequest;

        if (chavePixFinal == null || chavePixFinal.isEmpty()) {
            ParametroEmpresaDTO parametrosAtivos = parametroEmpresaService.buscarPorEmpresaId(empresaVenda)
                    .orElse(null);
            if (parametrosAtivos != null && parametrosAtivos.getChavePix() != null) {
                String chavePixParametrizada = parametrosAtivos.getChavePix().trim();
                if (!chavePixParametrizada.isEmpty()) {
                    chavePixFinal = chavePixParametrizada;
                }
            }
        }

        venda.setChavePix(chavePixFinal);
        venda.setCpfCliente(request.getCpfCliente());

        Venda savedVenda = vendaRepository.save(venda);

        return toResponse(savedVenda);
    }

    public List<VendaResponse> listarTodas(Usuario u, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        Long eid = scope.orElse(null);
        if (eid == null) {
            return vendaRepository.findAll().stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }
        return vendaRepository.findByEmpresaId(eid).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public Optional<VendaResponse> buscarPorId(Long id, Usuario u, Long empresaIdParam) {
        return vendaRepository.findById(id)
                .map(v -> {
                    assertVendaReadable(u, v, empresaIdParam);
                    return toResponse(v);
                });
    }

    public List<VendaResponse> buscarPorPeriodo(LocalDateTime startDate, LocalDateTime endDate, Usuario u, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        Long eid = scope.orElse(null);
        return vendaRepository.findByDataVendaBetweenScoped(startDate, endDate, eid).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public void deletar(Long id, Usuario u, Long empresaIdParam) {
        Venda v = vendaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        assertVendaReadable(u, v, empresaIdParam);
        vendaRepository.deleteById(id);
    }

    private void assertVendaReadable(Usuario u, Venda v, Long empresaIdParam) {
        Optional<Long> scope = empresaScopeService.resolveForList(u, empresaIdParam);
        if (scope.isEmpty()) {
            if (u.getRole() == Role.ADM) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (v.getEmpresaId() == null || !v.getEmpresaId().equals(scope.get())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Venda de outra empresa.");
        }
    }

    private VendaResponse toResponse(Venda venda) {
        VendaResponse response = new VendaResponse();
        response.setId(venda.getId());
        response.setEmpresaId(venda.getEmpresaId());
        response.setNomeOperador(venda.getNomeOperador());
        response.setSubtotal(venda.getSubtotal());
        response.setDesconto(venda.getDesconto());
        response.setTotal(venda.getTotal());
        response.setDataVenda(venda.getDataVenda());
        response.setFormaPagamento(venda.getFormaPagamento());
        response.setParcelas(venda.getParcelas());
        response.setChavePix(venda.getChavePix());
        response.setCpfCliente(venda.getCpfCliente());

        List<VendaResponse.VendaItemResponse> itensResponse = venda.getItens().stream()
                .map(item -> {
                    VendaResponse.VendaItemResponse itemResp = new VendaResponse.VendaItemResponse();
                    itemResp.setProdutoId(item.getProdutoId());
                    itemResp.setNome(item.getNome());
                    itemResp.setPreco(item.getPreco());
                    itemResp.setQuantidade(item.getQuantidade());
                    itemResp.setSubtotal(item.getSubtotal());
                    return itemResp;
                })
                .collect(Collectors.toList());

        response.setItens(itensResponse);

        return response;
    }
}
