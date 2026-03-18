package com.sistema.cadastro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TrocarSenhaPrimeiroAcessoRequest {

    @NotBlank(message = "Informe a senha atual")
    private String senhaAtual;

    @NotBlank(message = "Informe a nova senha")
    @Size(min = 6, max = 100, message = "Nova senha: mínimo 6 caracteres")
    private String novaSenha;
}
