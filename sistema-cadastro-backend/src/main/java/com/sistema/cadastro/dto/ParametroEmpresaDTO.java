package com.sistema.cadastro.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParametroEmpresaDTO {
    
    private Long id;
    private Long empresaId;
    private String nomeEmpresa;
    private String logoUrl;
    private String corPrimaria;
    private String corSecundaria;
    private String corFundo;
    private String corTexto;
    private String corBotao;
    private String corBotaoTexto;
    private String mensagemBoasVindas;
    // Chave PIX padrão da empresa (para pagamentos no PDV)
    private String chavePix;
    private Boolean ativo;
}
