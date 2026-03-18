package com.sistema.cadastro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    /** Empresa (ID) para PDV/login inteligente. Null = usar app.pdv.empresa-padrao-id. */
    @Column(name = "empresa_id_pdv")
    private Long empresaId;

    /** Único PDV em que o usuário pode operar; null = ainda não cadastrado em caixa. */
    @Column(name = "pdv_terminal_id")
    private Long pdvTerminalId;

    @Column(length = 25)
    private String telefone;

    /** true = cadastro pelo ADM com senha provisória; usuário deve trocar no 1º acesso. */
    @Column(name = "must_change_password", nullable = false)
    private Boolean mustChangePassword = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
