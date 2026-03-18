package com.sistema.cadastro.dto;

import com.sistema.cadastro.model.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminCreateUserResponse {
    private Long id;
    private String username;
    private Role role;
    private Long empresaId;
    private String telefone;
    /** Preenchido só quando a senha foi gerada automaticamente; repassar ao usuário com segurança. */
    private String senhaTemporaria;
    private boolean deveRedefinirSenha;
}
