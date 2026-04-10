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
    /** Suporte: tela Suporte da retaguarda (por empresa). */
    private String suporteEmail;
    private String suporteWhatsapp;
    private String segmento;
    private Boolean moduloFarmaciaAtivo;
    private Boolean farmaciaLoteValidadeObrigatorio;
    private Boolean farmaciaControladosAtivo;
    private Boolean farmaciaAntimicrobianosAtivo;
    private Boolean farmaciaPmcAtivo;
    private String farmaciaPmcModo;
    private Boolean moduloInformaticaAtivo;
    /** Dados para cabeçalho/rodapé da impressão da ordem de serviço. */
    private String enderecoLinha1Os;
    private String cidadeUfOs;
    private String cnpj;
    private String inscricaoMunicipal;
    private String telefoneComercial;
    private String fax;
    private String emailComercial;
    private String textoTermosOs;
    private Boolean ativo;
}
