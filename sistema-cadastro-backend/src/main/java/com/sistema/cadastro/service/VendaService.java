package com.sistema.cadastro.service;

import com.sistema.cadastro.dto.VendaRequest;
import com.sistema.cadastro.dto.VendaResponse;
import com.sistema.cadastro.model.Usuario;
import com.sistema.cadastro.model.Venda;
import com.sistema.cadastro.model.VendaItem;
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
        
        // Converter itens
        List<VendaItem> itens = request.getItens().stream()
                .map(itemReq -> {
                    VendaItem item = new VendaItem();
                    item.setProdutoId(itemReq.getProdutoId());
                    item.setNome(itemReq.getNome());
                    item.setPreco(itemReq.getPreco());
                    item.setQuantidade(itemReq.getQuantidade());
                    item.setSubtotal(itemReq.getSubtotal());
                    return item;
                })
                .collect(Collectors.toList());
        
        venda.setItens(itens);
        
        // Calcular subtotal
        BigDecimal subtotal = itens.stream()
                .map(VendaItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        venda.setSubtotal(subtotal);
        venda.setDesconto(request.getDesconto() != null ? request.getDesconto() : BigDecimal.ZERO);
        venda.setTotal(subtotal.subtract(venda.getDesconto()));
        
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

