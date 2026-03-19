package com.sistema.cadastro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "fechamentos_caixa")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FechamentoCaixa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(name = "terminal_id")
    private Long terminalId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "nome_operador", nullable = false, length = 100)
    private String nomeOperador;

    @Column(name = "data_referencia", nullable = false)
    private LocalDate dataReferencia;

    @Column(name = "quantidade_vendas", nullable = false)
    private Integer quantidadeVendas;

    @Column(name = "total_dinheiro", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalDinheiro;

    @Column(name = "total_cartao", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalCartao;

    @Column(name = "total_pix", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalPix;

    @Column(name = "total_geral", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalGeral;

    @Column(name = "valor_informado_dinheiro", precision = 12, scale = 2)
    private BigDecimal valorInformadoDinheiro;

    @Column(name = "diferenca_dinheiro", precision = 12, scale = 2)
    private BigDecimal diferencaDinheiro;

    @CreationTimestamp
    @Column(name = "data_fechamento", updatable = false)
    private LocalDateTime dataFechamento;
}

