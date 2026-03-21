package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProdutoResponse {
    private Long id;
    /** Empresa dona do cadastro. */
    private Long empresaId;
    private String nome;
    private String descricao;
    private BigDecimal preco;

    private BigDecimal precoPromocional;
    private LocalDate promocaoInicio;
    private LocalDate promocaoFim;
    private Boolean emPromocao;

    private Integer promoQtdLevar;
    private Integer promoQtdPagar;

    private Integer quantidadeEstoque;
    private Integer estoqueMinimo;
    private String categoria;
    private String codigoProduto;
    private String tipo; // CAIXA ou UNIDADE
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
