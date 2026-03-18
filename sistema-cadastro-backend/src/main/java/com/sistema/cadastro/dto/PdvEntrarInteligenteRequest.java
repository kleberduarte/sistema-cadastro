package com.sistema.cadastro.dto;

import lombok.Data;

@Data
public class PdvEntrarInteligenteRequest {
    /** ID da empresa onde o caixa será usado (tela de login). Opcional: se ausente, usa cadastro do usuário ou padrão. */
    private Long empresaId;
}
