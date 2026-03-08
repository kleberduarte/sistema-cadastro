package com.sistema.cadastro.dto;

import com.sistema.cadastro.model.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    
    @NotBlank(message = "Username é obrigatório")
    @Size(min = 3, max = 50, message = "Username deve ter entre 3 e 50 caracteres")
    private String username;
    
    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 4, message = "Senha deve ter pelo menos 4 caracteres")
    private String password;
    
    private Role role = Role.VENDEDOR;
}
