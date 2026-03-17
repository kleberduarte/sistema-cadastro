package com.sistema.cadastro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "vendas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Venda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "nome_operador", nullable = false, length = 100)
    private String nomeOperador;

    @ElementCollection
    @CollectionTable(name = "venda_itens", joinColumns = @JoinColumn(name = "venda_id"))
    private List<VendaItem> itens;

    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "desconto", precision = 10, scale = 2)
    private BigDecimal desconto = BigDecimal.ZERO;

    @Column(name = "total", nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @CreationTimestamp
    @Column(name = "data_venda", updatable = false)
    private LocalDateTime dataVenda;

    @Column(name = "forma_pagamento", length = 20)
    private String formaPagamento;

    @Column(name = "parcelas")
    private Integer parcelas;

    @Column(name = "chave_pix", length = 255)
    private String chavePix;

    @Column(name = "cpf_cliente", length = 14)
    private String cpfCliente;
}

