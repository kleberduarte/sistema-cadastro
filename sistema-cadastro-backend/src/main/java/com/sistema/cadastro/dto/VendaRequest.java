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

    private String cpfCliente;

    // Campos mantidos para compatibilidade, mas a lógica principal usará 'pagamentos'
    private String formaPagamento;
    private Integer parcelas;
    private String chavePix;
    private String dataVenda;
    private BigDecimal valorRecebido;
    private BigDecimal troco;
    
    private List<PagamentoRequest> pagamentos;

    // Getters inteligentes para compatibilidade com código antigo do VendaService
    public String getFormaPagamento() {
        if (this.formaPagamento != null) return this.formaPagamento;
        if (this.pagamentos != null && !this.pagamentos.isEmpty()) {
            return this.pagamentos.get(0).getForma();
        }
        return "DINHEIRO"; // Default seguro
    }

    public Integer getParcelas() {
        if (this.parcelas != null) return this.parcelas;
        if (this.pagamentos != null && !this.pagamentos.isEmpty()) {
            return this.pagamentos.get(0).getParcelas();
        }
        return 1;
    }

    public BigDecimal getValorRecebido() {
         if (this.valorRecebido != null) return this.valorRecebido;
         if (this.pagamentos != null) {
             return this.pagamentos.stream()
                 .map(PagamentoRequest::getValor)
                 .reduce(BigDecimal.ZERO, BigDecimal::add);
         }
         return BigDecimal.ZERO;
    }

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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PagamentoRequest {
        private String forma;
        private BigDecimal valor;
        private Integer parcelas;
    }
}
