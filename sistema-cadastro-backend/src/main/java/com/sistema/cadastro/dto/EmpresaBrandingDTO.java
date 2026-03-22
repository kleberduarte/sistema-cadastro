package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Dados públicos de identidade visual (login PDV / vitrine) — sem chave PIX etc. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmpresaBrandingDTO {
    private Long empresaId;
    private String nomeEmpresa;
    private String logoUrl;
    private String corPrimaria;
    private String corSecundaria;
    private String corFundo;
    private String corTexto;
    private String corBotao;
    private String corBotaoTexto;
    /** Texto de boas-vindas (login / cabeçalho) — público, sem dados sensíveis. */
    private String mensagemBoasVindas;
}
