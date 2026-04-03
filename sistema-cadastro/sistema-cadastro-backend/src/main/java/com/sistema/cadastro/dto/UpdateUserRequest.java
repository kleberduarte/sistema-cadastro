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
public class UpdateUserRequest {
    
    @NotBlank(message = "Username é obrigatório")
    @Size(min = 3, max = 50, message = "Username deve ter entre 3 e 50 caracteres")
    private String username;
    
    private Role role;
    
    private String password; // Opcional - se vazio, mantém a senha atual

    /** ID empresa para PDV; null se vazio. Só aplica se {@link #aplicarEmpresaPdv} for true. */
    private Long empresaIdPdv;

    /** Se true, grava {@link #empresaIdPdv} (null ou &lt;1 = usar empresa padrão do sistema). */
    private Boolean aplicarEmpresaPdv;

    /** Se true, remove o vínculo do usuário com o PDV (pode cadastrar em outro caixa depois). */
    private Boolean desvincularPdv;

    @jakarta.validation.constraints.Size(max = 25)
    private String telefone;

    /** Se true, atualiza o telefone (inclusive para limpar). */
    private Boolean aplicarTelefone;
}

