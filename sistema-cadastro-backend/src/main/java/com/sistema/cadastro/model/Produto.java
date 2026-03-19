package com.sistema.cadastro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "produtos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal preco;

    /** Preço promocional (opcional). Usado quando a promoção estiver ativa. */
    @Column(name = "preco_promocional", precision = 10, scale = 2)
    private BigDecimal precoPromocional;

    /** Datas (opcional). Se informado, a promoção fica ativa entre início e fim. */
    @Column(name = "promocao_inicio")
    private LocalDate promocaoInicio;

    @Column(name = "promocao_fim")
    private LocalDate promocaoFim;

    /** Marca para forçar promoção ativa (opcional). */
    @Column(name = "em_promocao")
    private Boolean emPromocao = false;

    /**
     * Desconto por quantidade: "Leve X, pague Y".
     * Ex.: X=3, Y=2 => a cada 3 unidades, paga 2 e leva 3.
     */
    @Column(name = "promo_qtd_levar")
    private Integer promoQtdLevar;

    @Column(name = "promo_qtd_pagar")
    private Integer promoQtdPagar;

    @Column(nullable = false)
    private Integer quantidadeEstoque;

    /** Estoque mínimo configurável para alertas no PDV. */
    @Column(name = "estoque_minimo")
    private Integer estoqueMinimo = 0;

    @Column(length = 50)
    private String categoria;

    @Column(name = "codigo_produto", length = 50, unique = true)
    private String codigoProduto;

    @Column(length = 20)
    private String tipo; // CAIXA ou UNIDADE

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
