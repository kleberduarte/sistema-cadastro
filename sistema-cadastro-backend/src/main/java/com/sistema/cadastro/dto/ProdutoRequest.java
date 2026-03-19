package com.sistema.cadastro.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProdutoRequest {
    
    @NotBlank(message = "Nome é obrigatório")
    private String nome;
    
    private String descricao;
    
    @NotNull(message = "Preço é obrigatório")
    @DecimalMin(value = "0.01", message = "Preço deve ser maior que zero")
    private BigDecimal preco;

    /** Preço promocional (opcional). */
    @DecimalMin(value = "0.01", message = "Preço promocional deve ser maior que zero")
    private BigDecimal precoPromocional;

    /** Promoção: início (opcional). */
    private LocalDate promocaoInicio;

    /** Promoção: fim (opcional). */
    private LocalDate promocaoFim;

    /** Promoção: liga manualmente (opcional). */
    private Boolean emPromocao;

    /** Promo por quantidade: leve (X). */
    @jakarta.validation.constraints.Min(value = 1, message = "Quantidade (levar) deve ser >= 1")
    private Integer promoQtdLevar;

    /** Promo por quantidade: pague (Y). */
    @jakarta.validation.constraints.Min(value = 1, message = "Quantidade (pagar) deve ser >= 1")
    private Integer promoQtdPagar;
    
    @NotNull(message = "Quantidade é obrigatória")
    @Min(value = 0, message = "Quantidade não pode ser negativa")
    private Integer quantidadeEstoque;

    @Min(value = 0, message = "Estoque mínimo não pode ser negativo")
    private Integer estoqueMinimo;
    
    private String categoria;
    private String codigoProduto;
    private String tipo; // CAIXA ou UNIDADE
}
