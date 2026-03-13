package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.VendaRequest;
import com.sistema.cadastro.dto.VendaResponse;
import com.sistema.cadastro.dto.ParametroEmpresaDTO;
import com.sistema.cadastro.model.Produto;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.model.Venda;
import com.sistema.cadastro.model.VendaItem;
import com.sistema.cadastro.repository.ProdutoRepository;
import com.sistema.cadastro.repository.UsuarioRepository;
import com.sistema.cadastro.repository.VendaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public VendaResponse criarVenda(VendaRequest request) {
        // Buscar usuário
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(request.getUsuarioId());
        if (usuarioOpt.isEmpty()) {
            throw new RuntimeException("Usuário não encontrado");
        }
        
        Usuario usuario = usuarioOpt.get();
        
        // Criar venda
        Venda venda = new Venda();
        venda.setUsuario(usuario);
        venda.setNomeOperador(usuario.getUsername());
        
        // Converter itens e fazer baixa no estoque
        List<VendaItem> itens = new ArrayList<>();
        for (VendaRequest.VendaItemRequest itemReq : request.getItens()) {
            // Buscar produto e fazer baixa no estoque
            Optional<Produto> produtoOpt = produtoRepository.findById(itemReq.getProdutoId());
            if (produtoOpt.isEmpty()) {
                throw new RuntimeException("Produto não encontrado: " + itemReq.getProdutoId());
            }
            
            Produto produto = produtoOpt.get();
            
            // Verificar se há estoque suficiente
            if (produto.getQuantidadeEstoque() < itemReq.getQuantidade()) {
                throw new RuntimeException("Estoque insuficiente para o produto: " + produto.getNome());
            }
            
            // Decrementar estoque
            produto.setQuantidadeEstoque(produto.getQuantidadeEstoque() - itemReq.getQuantidade());
            
            // Salvar atualização do estoque
            produtoRepository.save(produto);
            
            // Criar item da venda
            VendaItem item = new VendaItem();
            item.setProdutoId(itemReq.getProdutoId());
            item.setNome(itemReq.getNome());
            item.setPreco(itemReq.getPreco());
            item.setQuantidade(itemReq.getQuantidade());
            item.setSubtotal(itemReq.getSubtotal());
            itens.add(item);
        }
        
        venda.setItens(itens);
        
        // Calcular subtotal
        BigDecimal subtotal = itens.stream()
                .map(VendaItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        venda.setSubtotal(subtotal);
        venda.setDesconto(request.getDesconto() != null ? request.getDesconto() : BigDecimal.ZERO);
        venda.setTotal(subtotal.subtract(venda.getDesconto()));
        
        // Definir forma de pagamento e campos relacionados
        venda.setFormaPagamento(request.getFormaPagamento());
        venda.setParcelas(request.getParcelas());

        String chavePixRequest = request.getChavePix() != null ? request.getChavePix().trim() : null;
        String chavePixFinal = chavePixRequest;

        if (chavePixFinal == null || chavePixFinal.isEmpty()) {
            ParametroEmpresaDTO parametrosAtivos = parametroEmpresaService.getParametrosAtivos();
            if (parametrosAtivos != null && parametrosAtivos.getChavePix() != null) {
                String chavePixParametrizada = parametrosAtivos.getChavePix().trim();
                if (!chavePixParametrizada.isEmpty()) {
                    chavePixFinal = chavePixParametrizada;
                }
            }
        }

        venda.setChavePix(chavePixFinal);
        
        // Salvar
        Venda savedVenda = vendaRepository.save(venda);
        
        return toResponse(savedVenda);
    }

    public List<VendaResponse> listarTodas() {
        return vendaRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public Optional<VendaResponse> buscarPorId(Long id) {
        return vendaRepository.findById(id)
                .map(this::toResponse);
    }

    public List<VendaResponse> buscarPorPeriodo(LocalDateTime startDate, LocalDateTime endDate) {
        return vendaRepository.findByDataVendaBetween(startDate, endDate).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<VendaResponse> buscarPorUsuario(Long usuarioId) {
        return vendaRepository.findByUsuarioId(usuarioId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public void deletar(Long id) {
        vendaRepository.deleteById(id);
    }

    private VendaResponse toResponse(Venda venda) {
        VendaResponse response = new VendaResponse();
        response.setId(venda.getId());
        response.setNomeOperador(venda.getNomeOperador());
        response.setSubtotal(venda.getSubtotal());
        response.setDesconto(venda.getDesconto());
        response.setTotal(venda.getTotal());
        response.setDataVenda(venda.getDataVenda());
        response.setFormaPagamento(venda.getFormaPagamento());
        response.setParcelas(venda.getParcelas());
        response.setChavePix(venda.getChavePix());
        
        // Converter itens
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

