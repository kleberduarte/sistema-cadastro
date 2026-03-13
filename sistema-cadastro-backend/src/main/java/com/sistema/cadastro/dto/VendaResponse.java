package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VendaResponse {
    
    private Long id;
    private String nomeOperador;
    private List<VendaItemResponse> itens;
    private BigDecimal subtotal;
    private BigDecimal desconto;
    private BigDecimal total;
    private LocalDateTime dataVenda;
    private String formaPagamento;
    private Integer parcelas;
    private String chavePix;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VendaItemResponse {
        
        private Long produtoId;
        private String nome;
        private BigDecimal preco;
        private Integer quantidade;
        private BigDecimal subtotal;
    }
}

