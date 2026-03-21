package com.sistema.cadastro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "clientes",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_cliente_empresa_email", columnNames = {"empresa_id", "email"}),
                @UniqueConstraint(name = "uk_cliente_empresa_cpf", columnNames = {"empresa_id", "cpf"})
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false, length = 20)
    private String telefone;

    @Column(length = 255)
    private String endereco;

    @Column(nullable = false, length = 14)
    private String cpf;

    /** Código para cadastro público de usuários vinculados ao PDV desta empresa (cliente). */
    @Column(name = "codigo_convite_pdv", length = 512)
    private String codigoConvitePdv;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
