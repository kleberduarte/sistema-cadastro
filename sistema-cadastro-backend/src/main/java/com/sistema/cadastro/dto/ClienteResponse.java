package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClienteResponse {
    private Long id;
    private Long empresaId;
    private String nome;
    private String email;
    private String telefone;
    private String endereco;
    private String cpf;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** Indica se já existe código de convite PDV configurado (sem expor o código). */
    private Boolean possuiCodigoConvitePdv;
}
