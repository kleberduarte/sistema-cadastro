package com.sistema.cadastro.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "pdv_terminais", uniqueConstraints = {
        @UniqueConstraint(name = "uk_pdv_empresa_codigo", columnNames = {"empresa_id", "codigo"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PdvTerminal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(nullable = false, length = 50)
    private String codigo;

    @Column(length = 120)
    private String nome;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @Column(name = "ultimo_heartbeat")
    private Instant ultimoHeartbeat;

    @Column(name = "ultimo_operador", length = 80)
    private String ultimoOperador;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_caixa", nullable = false, length = 10)
    @Builder.Default
    private PdvCaixaStatus statusCaixa = PdvCaixaStatus.LIVRE;
}
