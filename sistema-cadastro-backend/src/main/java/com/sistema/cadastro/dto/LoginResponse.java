package com.sistema.cadastro.dto;

import com.sistema.cadastro.model.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private Long id;
    private String username;
    private Role role;
    private String message;
    /** ID da empresa usada no PDV (usuário ou padrão). */
    private Long empresaId;
}
