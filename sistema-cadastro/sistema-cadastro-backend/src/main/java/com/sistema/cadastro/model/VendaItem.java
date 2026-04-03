package com.sistema.cadastro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VendaItem {

    @Column(name = "produto_id")
    private Long produtoId;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal preco;

    @Column(nullable = false)
    private Integer quantidade;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "lote_codigo", length = 60)
    private String loteCodigo;

    @Column(name = "lote_validade")
    private LocalDate loteValidade;

    @Column(name = "receita_tipo", length = 30)
    private String receitaTipo;

    @Column(name = "receita_numero", length = 60)
    private String receitaNumero;

    @Column(name = "receita_prescritor", length = 120)
    private String receitaPrescritor;

    @Column(name = "receita_data")
    private LocalDate receitaData;

    @Column(name = "pmc_aplicado", precision = 10, scale = 2)
    private BigDecimal pmcAplicado;

    @Column(name = "pmc_status", length = 20)
    private String pmcStatus;
}

