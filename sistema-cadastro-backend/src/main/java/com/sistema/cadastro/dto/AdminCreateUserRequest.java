package com.sistema.cadastro.dto;

import com.sistema.cadastro.model.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminCreateUserRequest {

    @NotBlank(message = "Username é obrigatório")
    @Size(min = 3, max = 50)
    private String username;

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 4, max = 100)
    private String password;

    private Role role = Role.VENDEDOR;

    private Long empresaId;

    @Size(max = 25)
    private String telefone;
}
