package com.sistema.cadastro.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VendaRequest {
    
    @NotNull(message = "ID do usuário é obrigatório")
    private Long usuarioId;
    
    @NotNull(message = "Itens da venda são obrigatórios")
    private List<VendaItemRequest> itens;
    
    @PositiveOrZero(message = "Desconto não pode ser negativo")
    private BigDecimal desconto = BigDecimal.ZERO;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VendaItemRequest {
        
        private Long produtoId;
        
        private String nome;
        
        private BigDecimal preco;
        
        private Integer quantidade;
        
        private BigDecimal subtotal;
    }
}

