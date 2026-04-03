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
@Table(name = "pmc_referencias")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PmcReferencia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(name = "produto_id")
    private Long produtoId;

    @Column(name = "registro_ms", length = 30)
    private String registroMs;

    @Column(name = "gtin_ean", length = 30)
    private String gtinEan;

    @Column(name = "descricao", length = 255)
    private String descricao;

    @Column(name = "pmc", nullable = false, precision = 10, scale = 2)
    private BigDecimal pmc;

    @Column(name = "vigencia_inicio", nullable = false)
    private LocalDate vigenciaInicio;

    @Column(name = "vigencia_fim")
    private LocalDate vigenciaFim;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

